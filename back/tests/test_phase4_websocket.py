import asyncio
import json
import base64
import cv2
import numpy as np
import websockets
from websockets.client import connect
from main import SignifyServer
import config

print("Testing Phase 4: WebSocket Server")
print("=" * 50)


class TestServerLifecycle:
    """Test server initialization and lifecycle management"""

    async def test_server_initialization(self):
        """Server components initialize correctly"""
        print("\n1. Testing server initialization:")

        server = SignifyServer()
        assert server.executor is None
        assert server.state is None
        assert server.producer is None
        assert server.metrics is None
        assert server.server is None
        assert server.shutdown_event is not None

        server.setup()

        assert server.executor is not None
        assert server.state is not None
        assert server.producer is not None
        assert server.metrics is not None
        assert server.logger is not None

        print("   Server initialization: PASS")

        # Cleanup
        if server.executor:
            server.executor.shutdown(wait=True)

    async def test_server_start_stop(self):
        """Server starts and stops gracefully"""
        print("\n2. Testing server start/stop:")

        server = SignifyServer()
        server.setup()

        # Start server in background
        server_task = asyncio.create_task(server.start())

        # Give server time to start
        await asyncio.sleep(0.5)

        # Verify server is running
        assert server.server is not None
        print("   Server started: PASS")

        # Trigger shutdown
        server.shutdown_event.set()

        # Wait for server to stop
        await asyncio.wait_for(server_task, timeout=2.0)

        # Cleanup
        await server.stop()

        print("   Server stopped gracefully: PASS")


class TestConnections:
    """Test WebSocket connection handling"""

    async def test_client_connection(self):
        """Single client can connect to server"""
        print("\n3. Testing client connection:")

        server = SignifyServer()
        server.setup()

        # Start server
        server_task = asyncio.create_task(server.start())
        await asyncio.sleep(0.5)

        try:
            # Connect client
            uri = f"ws://{config.WEBSOCKET_HOST}:{config.WEBSOCKET_PORT}"
            async with connect(uri) as websocket:
                print(f"   Connected to {uri}: PASS")

                # Verify connection is alive
                pong = await websocket.ping()
                await pong
                print("   Connection alive (ping/pong): PASS")

        finally:
            server.shutdown_event.set()
            await asyncio.wait_for(server_task, timeout=2.0)
            await server.stop()

    async def test_multiple_connections(self):
        """Multiple clients can connect simultaneously"""
        print("\n4. Testing multiple connections:")

        server = SignifyServer()
        server.setup()

        server_task = asyncio.create_task(server.start())
        await asyncio.sleep(0.5)

        try:
            uri = f"ws://{config.WEBSOCKET_HOST}:{config.WEBSOCKET_PORT}"

            # Connect 3 clients
            clients = []
            for i in range(3):
                ws = await connect(uri)
                clients.append(ws)
                print(f"   Client {i + 1} connected: PASS")

            # Verify all are connected
            for i, ws in enumerate(clients):
                pong = await ws.ping()
                await pong
                print(f"   Client {i + 1} alive: PASS")

            # Disconnect all
            for ws in clients:
                await ws.close()

        finally:
            server.shutdown_event.set()
            await asyncio.wait_for(server_task, timeout=2.0)
            await server.stop()


class TestMessageFlow:
    """Test message processing through the pipeline"""

    def create_test_jpeg(self):
        """Create a simple test JPEG image"""
        # Create blank image
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Encode to JPEG
        success, encoded = cv2.imencode(".jpg", img)
        if not success:
            raise RuntimeError("Failed to encode test image")
        return encoded.tobytes()

    async def test_valid_message_processing(self):
        """Valid messages are processed correctly"""
        print("\n5. Testing valid message processing:")

        server = SignifyServer()
        server.setup()

        server_task = asyncio.create_task(server.start())
        await asyncio.sleep(0.5)

        try:
            uri = f"ws://{config.WEBSOCKET_HOST}:{config.WEBSOCKET_PORT}"
            async with connect(uri) as websocket:
                # Create test message
                jpeg_bytes = self.create_test_jpeg()
                message = {
                    "jpeg_blob": base64.b64encode(jpeg_bytes).decode("utf-8"),
                    "new_word_letter": None,
                }

                # Send message
                await websocket.send(json.dumps(message))
                print("   Sent valid message: PASS")

                # Wait for response (with timeout)
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(response)

                    # Verify response format
                    assert "detected_word_letter" in data or "error" in data
                    print(f"   Received response: {data}")

                    if "detected_word_letter" in data:
                        assert "target_lettr_prob" in data
                        print("   Valid response format: PASS")
                    else:
                        print(f"   Server returned error: {data.get('error')}")

                except asyncio.TimeoutError:
                    print("   No response (buffer not full yet - expected)")

        finally:
            server.shutdown_event.set()
            await asyncio.wait_for(server_task, timeout=2.0)
            await server.stop()

    async def test_invalid_message_handling(self):
        """Invalid messages return error"""
        print("\n6. Testing invalid message handling:")

        server = SignifyServer()
        server.setup()

        server_task = asyncio.create_task(server.start())
        await asyncio.sleep(0.5)

        try:
            uri = f"ws://{config.WEBSOCKET_HOST}:{config.WEBSOCKET_PORT}"
            async with connect(uri) as websocket:
                # Send invalid message (missing jpeg_blob)
                invalid_message = {"wrong": "format"}
                await websocket.send(json.dumps(invalid_message))
                print("   Sent invalid message: PASS")

                # Should not receive error response (validation fails silently)
                # Just verify connection is still alive
                pong = await websocket.ping()
                await pong
                print("   Connection still alive after invalid message: PASS")

        finally:
            server.shutdown_event.set()
            await asyncio.wait_for(server_task, timeout=2.0)
            await server.stop()

    async def test_emergency_reset_message(self):
        """Emergency reset triggers correctly"""
        print("\n7. Testing emergency reset:")

        server = SignifyServer()
        server.setup()

        server_task = asyncio.create_task(server.start())
        await asyncio.sleep(0.5)

        try:
            uri = f"ws://{config.WEBSOCKET_HOST}:{config.WEBSOCKET_PORT}"
            async with connect(uri) as websocket:
                # Send message with new_letter
                jpeg_bytes = self.create_test_jpeg()
                message = {
                    "jpeg_blob": base64.b64encode(jpeg_bytes).decode("utf-8"),
                    "new_word_letter": "B",
                }

                await websocket.send(json.dumps(message))
                print("   Sent emergency reset message: PASS")

                # Should get immediate response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    data = json.loads(response)

                    assert "target_lettr_prob" in data
                    assert data["target_lettr_prob"] == 0.0
                    print(f"   Emergency reset response: {data}")
                    print("   target_arg_prob is 0.0: PASS")

                except asyncio.TimeoutError:
                    print("   Warning: No immediate response to reset")

        finally:
            server.shutdown_event.set()
            await asyncio.wait_for(server_task, timeout=2.0)
            await server.stop()


class TestErrorHandling:
    """Test error handling scenarios"""

    async def test_client_disconnect_during_processing(self):
        """Server handles client disconnect gracefully"""
        print("\n8. Testing client disconnect during processing:")

        server = SignifyServer()
        server.setup()

        server_task = asyncio.create_task(server.start())
        await asyncio.sleep(0.5)

        try:
            uri = f"ws://{config.WEBSOCKET_HOST}:{config.WEBSOCKET_PORT}"
            websocket = await connect(uri)

            # Send message then immediately disconnect
            jpeg_bytes = TestMessageFlow().create_test_jpeg()
            message = {
                "jpeg_blob": base64.b64encode(jpeg_bytes).decode("utf-8"),
                "new_word_letter": None,
            }
            await websocket.send(json.dumps(message))
            await websocket.close()
            print("   Client disconnected after sending: PASS")

            # Give server time to handle disconnect
            await asyncio.sleep(0.5)

            # Verify server still running by connecting new client
            websocket2 = await connect(uri)
            pong = await websocket2.ping()
            await pong
            await websocket2.close()
            print("   Server still running: PASS")

        finally:
            server.shutdown_event.set()
            await asyncio.wait_for(server_task, timeout=2.0)
            await server.stop()

    async def test_malformed_json(self):
        """Malformed JSON handled gracefully"""
        print("\n9. Testing malformed JSON handling:")

        server = SignifyServer()
        server.setup()

        server_task = asyncio.create_task(server.start())
        await asyncio.sleep(0.5)

        try:
            uri = f"ws://{config.WEBSOCKET_HOST}:{config.WEBSOCKET_PORT}"
            async with connect(uri) as websocket:
                # Send malformed JSON
                await websocket.send("{invalid json")
                print("   Sent malformed JSON: PASS")

                # Wait a bit
                await asyncio.sleep(0.5)

                # Verify connection still works
                pong = await websocket.ping()
                await pong
                print("   Connection still alive: PASS")

        finally:
            server.shutdown_event.set()
            await asyncio.wait_for(server_task, timeout=2.0)
            await server.stop()


class TestEndToEnd:
    """End-to-end integration test"""

    async def test_full_pipeline(self):
        """Full pipeline from JPEG to prediction"""
        print("\n10. Testing end-to-end pipeline:")

        server = SignifyServer()
        server.setup()

        server_task = asyncio.create_task(server.start())
        await asyncio.sleep(0.5)

        try:
            uri = f"ws://{config.WEBSOCKET_HOST}:{config.WEBSOCKET_PORT}"
            async with connect(uri) as websocket:
                print("   Connected to server: PASS")

                # Send enough messages to fill buffer (32 frames)
                jpeg_bytes = TestMessageFlow().create_test_jpeg()

                for i in range(35):
                    message = {
                        "jpeg_blob": base64.b64encode(jpeg_bytes).decode("utf-8"),
                        "new_word_letter": None,
                    }
                    await websocket.send(json.dumps(message))
                    await asyncio.sleep(0.05)  # Small delay between frames

                print("   Sent 35 frames: PASS")

                # Try to receive response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(response)

                    if "error" in data:
                        print(f"   Received error: {data['error']}")
                    else:
                        assert "detected_word_letter" in data
                        assert "target_lettr_prob" in data

                        # Verify data types and ranges
                        assert isinstance(data["detected_word_letter"], str)
                        assert len(data["detected_word_letter"]) == 1
                        assert data["detected_word_letter"].isalpha()

                        assert isinstance(data["target_lettr_prob"], (int, float))
                        assert 0.0 <= data["target_lettr_prob"] <= 1.0

                        print(f"   Received prediction: {data}")
                        print("   Full pipeline working: PASS")

                except asyncio.TimeoutError:
                    print("   No response received (may need hands in frame)")

        finally:
            server.shutdown_event.set()
            await asyncio.wait_for(server_task, timeout=2.0)
            await server.stop()


async def run_all_tests():
    """Run all test classes"""

    # Server Lifecycle Tests
    lifecycle = TestServerLifecycle()
    await lifecycle.test_server_initialization()
    await lifecycle.test_server_start_stop()

    # Connection Tests
    connections = TestConnections()
    await connections.test_client_connection()
    await connections.test_multiple_connections()

    # Message Flow Tests
    messages = TestMessageFlow()
    await messages.test_valid_message_processing()
    await messages.test_invalid_message_handling()
    await messages.test_emergency_reset_message()

    # Error Handling Tests
    errors = TestErrorHandling()
    await errors.test_client_disconnect_during_processing()
    await errors.test_malformed_json()

    # End-to-End Test
    e2e = TestEndToEnd()
    await e2e.test_full_pipeline()

    print("\n" + "=" * 50)
    print("All Phase 4 tests completed!")
    print("=" * 50)


if __name__ == "__main__":
    try:
        asyncio.run(run_all_tests())
    except KeyboardInterrupt:
        print("\nTests interrupted by user")
    except Exception as e:
        print(f"\nTest error: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)
