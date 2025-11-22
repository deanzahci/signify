import asyncio
import json
import logging
import os
import signal
import sys
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread
from typing import Optional

import websockets
from websockets.server import WebSocketServerProtocol

import config
from app.producer import Producer
from app.state import PipelineState
from utils.async_helpers import format_error_response
from utils.logging_config import setup_logging
from utils.metrics import PerformanceMetrics


class HealthCheckHandler(BaseHTTPRequestHandler):
    """Simple HTTP health check endpoint for Railway monitoring."""

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            health_data = {
                "status": "healthy",
                "service": "signify-backend",
                "version": "1.0.0",
                "model": "ONNX",
            }
            self.wfile.write(json.dumps(health_data).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Suppress HTTP logs to avoid cluttering output
        pass


class SignifyServer:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.executor: Optional[ThreadPoolExecutor] = None
        self.state: Optional[PipelineState] = None
        self.producer: Optional[Producer] = None
        self.metrics: Optional[PerformanceMetrics] = None
        self.server: Optional[websockets.server.WebSocketServer] = None
        self.shutdown_event = asyncio.Event()

    def setup(self):
        """Initialize server components"""
        setup_logging()
        self.logger.info("Initializing Signify WebSocket Server")

        self.executor = ThreadPoolExecutor(max_workers=config.THREAD_POOL_MAX_WORKERS)
        self.state = PipelineState()
        self.metrics = PerformanceMetrics()
        self.producer = Producer(self.state, self.executor, self.metrics)

        # Start health check server for Railway monitoring
        health_port = int(os.getenv("HEALTH_PORT", "8080"))
        health_server = HTTPServer(("0.0.0.0", health_port), HealthCheckHandler)
        health_thread = Thread(target=health_server.serve_forever, daemon=True)
        health_thread.start()
        self.logger.info(
            f"Health check endpoint available at http://0.0.0.0:{health_port}/health"
        )

        self.logger.info("Server components initialized")

    async def handle_client(self, websocket: WebSocketServerProtocol):
        """Handle individual client connection"""
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        self.logger.info(f"Client connected: {client_id}")

        try:
            async for message in websocket:
                try:
                    await self.producer.handle_message(message, websocket)
                except Exception as e:
                    self.logger.error(
                        f"Error handling message from {client_id}: {e}",
                        exc_info=True,
                    )
                    try:
                        error_response = format_error_response(str(e))
                        await websocket.send(error_response)
                    except Exception as send_err:
                        self.logger.error(f"Failed to send error response: {send_err}")

        except websockets.exceptions.ConnectionClosed as e:
            self.logger.info(f"Client disconnected: {client_id} (code={e.code})")
        except Exception as e:
            self.logger.error(
                f"Unexpected error with client {client_id}: {e}", exc_info=True
            )
        finally:
            self.logger.info(f"Connection closed: {client_id}")

    async def start(self):
        """Start the WebSocket server"""
        self.logger.info(
            f"Starting WebSocket server on {config.WEBSOCKET_HOST}:{config.WEBSOCKET_PORT}"
        )

        self.server = await websockets.serve(
            self.handle_client,
            config.WEBSOCKET_HOST,
            config.WEBSOCKET_PORT,
        )

        self.logger.info(
            f"Server listening on ws://{config.WEBSOCKET_HOST}:{config.WEBSOCKET_PORT}"
        )

        # Wait for shutdown signal
        await self.shutdown_event.wait()

    async def stop(self):
        """Stop the WebSocket server and cleanup resources"""
        self.logger.info("Shutting down server...")

        if self.server:
            self.server.close()
            await self.server.wait_closed()
            self.logger.info("WebSocket server closed")

        if self.producer and self.producer.current_task:
            self.producer.current_task.cancel()
            try:
                await self.producer.current_task
            except asyncio.CancelledError:
                pass

        if self.executor:
            self.executor.shutdown(wait=True)
            self.logger.info("Thread pool executor shut down")

        if self.metrics:
            stats = self.metrics.get_stats()
            self.logger.info(f"Final metrics: {stats}")

        self.logger.info("Shutdown complete")

    def handle_signal(self, sig):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {sig}, initiating shutdown")
        self.shutdown_event.set()


async def main():
    """Main entry point"""
    server = SignifyServer()
    server.setup()

    # Setup signal handlers
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda s=sig: server.handle_signal(s))

    try:
        await server.start()
    except Exception as e:
        server.logger.error(f"Server error: {e}", exc_info=True)
    finally:
        await server.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer interrupted by user")
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
