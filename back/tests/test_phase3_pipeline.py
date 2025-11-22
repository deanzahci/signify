import asyncio
import numpy as np
import cv2
from concurrent.futures import ThreadPoolExecutor
from app.state import PipelineState
from app.consumer import Consumer
from app.producer import Producer

print("Testing Phase 3: Pipeline Integration")
print("=" * 50)


# Mock WebSocket for testing
class MockWebSocket:
    def __init__(self):
        self.messages = []

    async def send(self, message):
        self.messages.append(message)
        print(f"   WebSocket.send() called: {message[:80]}...")


async def test_consumer():
    print("\n1. Testing Consumer initialization:")
    executor = ThreadPoolExecutor(max_workers=2)
    state = PipelineState()
    consumer = Consumer(state, executor)
    print(f"   Consumer initialized: {consumer is not None}")
    print(
        f"   Services loaded: preprocessing={consumer.preprocessing_service is not None}"
    )

    print("\n2. Testing Consumer.process_frame() with no hands:")
    # Create a blank image
    blank_image = np.ones((480, 640, 3), dtype=np.uint8) * 255
    success, jpeg_bytes = cv2.imencode(".jpg", blank_image)

    if success:
        result = await consumer.process_frame(jpeg_bytes.tobytes())
        print(f"   Result with no hands: {result} (expected: None)")

    executor.shutdown(wait=False)


async def test_producer():
    print("\n3. Testing Producer initialization:")
    executor = ThreadPoolExecutor(max_workers=2)
    state = PipelineState()
    state.current_target_letter = "A"
    producer = Producer(state, executor)
    print(f"   Producer initialized: {producer is not None}")
    print(f"   Consumer attached: {producer.consumer is not None}")
    print(f"   ThrottlingService attached: {producer.throttling_service is not None}")

    print("\n4. Testing Producer.handle_message() - parse message:")
    mock_ws = MockWebSocket()

    # Create test message
    test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    success, jpeg_bytes = cv2.imencode(".jpg", test_image)

    message = {"jpeg_blob": jpeg_bytes.tobytes(), "new_letter": None}

    await producer.handle_message(message, mock_ws)
    print(f"   Message handled (no hands expected, no response sent)")

    print("\n5. Testing Producer emergency reset:")
    message_with_reset = {"jpeg_blob": jpeg_bytes.tobytes(), "new_letter": "B"}

    await producer.handle_message(message_with_reset, mock_ws)
    print(f"   Emergency reset triggered for letter: B")
    print(f"   State reset: target_letter={state.current_target_letter}")
    print(f"   Keypoint buffer cleared: {len(state.keypoint_buffer)}/32")
    print(f"   Messages sent: {len(mock_ws.messages)}")

    executor.shutdown(wait=False)


async def main():
    await test_consumer()
    await test_producer()


print("\nRunning async tests...")
asyncio.run(main())

print("\n" + "=" * 50)
print("Phase 3 Pipeline tests completed!")
