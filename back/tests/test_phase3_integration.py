import asyncio
import numpy as np
import cv2
from concurrent.futures import ThreadPoolExecutor
from app.state import PipelineState
from app.consumer import Consumer
from app.producer import Producer
from utils.metrics import PerformanceMetrics
from utils.async_helpers import validate_message, format_response

print("Testing Phase 3: Integration Tests")
print("=" * 50)


class MockWebSocket:
    def __init__(self):
        self.messages = []

    async def send(self, message):
        self.messages.append(message)


async def test_helpers():
    print("\n1. Testing async helpers:")

    # Test validation
    valid_msg = {"jpeg_blob": b"fake_jpeg_data", "new_word_letter": "A"}
    result = validate_message(valid_msg)
    print(f"   Valid message: {result is not None}")

    invalid_msg = {"wrong": "format"}
    result = validate_message(invalid_msg)
    print(f"   Invalid message rejected: {result is None}")

    # Test formatting
    response = format_response("B", 0.8567)
    print(f"   Response format: {response}")
    assert '"detected_word_letter": "B"' in response
    assert '"target_lettr_prob": 0.8567' in response


async def test_metrics():
    print("\n2. Testing performance metrics:")
    metrics = PerformanceMetrics(window_size=10)

    # Record some operations
    metrics.record_frame_time(0.05)
    metrics.record_frame_time(0.06)
    metrics.record_dropped_frame()
    metrics.record_inference()

    stats = metrics.get_stats()
    print(f"   Processed frames: {stats['processed_frames']}")
    print(f"   Dropped frames: {stats['dropped_frames']}")
    print(f"   Inference count: {stats['inference_count']}")
    print(f"   Avg frame time: {stats['avg_frame_time_ms']}ms")
    print(f"   Drop rate: {stats['drop_rate']}%")


async def test_full_pipeline():
    print("\n3. Testing full pipeline with 32 frames:")
    executor = ThreadPoolExecutor(max_workers=2)
    state = PipelineState()
    state.current_target_letter = "A"
    metrics = PerformanceMetrics()
    producer = Producer(state, executor, metrics)
    mock_ws = MockWebSocket()

    # Send 37 frames (32 to fill buffer + 5 for smoothing)
    for i in range(37):
        test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        success, jpeg_bytes = cv2.imencode(".jpg", test_image)

        message = {"jpeg_blob": jpeg_bytes.tobytes(), "new_word_letter": None}

        await producer.handle_message(message, mock_ws)

        if i % 10 == 0:
            print(
                f"   Processed {i + 1} frames, buffer: {len(state.keypoint_buffer)}/32"
            )

    print(f"   Total messages sent: {len(mock_ws.messages)}")
    print(f"   Metrics: {metrics.get_stats()}")

    executor.shutdown(wait=False)


async def test_emergency_reset_during_processing():
    print("\n4. Testing emergency reset during active processing:")
    executor = ThreadPoolExecutor(max_workers=2)
    state = PipelineState()
    state.current_target_letter = "A"
    producer = Producer(state, executor)
    mock_ws = MockWebSocket()

    # Start processing a frame
    test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    success, jpeg_bytes = cv2.imencode(".jpg", test_image)

    message1 = {"jpeg_blob": jpeg_bytes.tobytes(), "new_word_letter": None}

    # Don't await, let it run in background
    task = asyncio.create_task(producer.handle_message(message1, mock_ws))

    # Immediately send emergency reset
    message2 = {"jpeg_blob": jpeg_bytes.tobytes(), "new_word_letter": "B"}

    await producer.handle_message(message2, mock_ws)

    print(f"   State after reset: target_letter={state.current_target_letter}")
    print(f"   Keypoint buffer cleared: {len(state.keypoint_buffer)}/32")
    print(f"   Emergency response sent: {len(mock_ws.messages) > 0}")

    # Wait for background task
    try:
        await asyncio.wait_for(task, timeout=2.0)
    except asyncio.TimeoutError:
        pass

    executor.shutdown(wait=False)


async def test_backpressure():
    print("\n5. Testing backpressure (frame dropping):")
    executor = ThreadPoolExecutor(max_workers=1)
    state = PipelineState()
    state.current_target_letter = "A"
    metrics = PerformanceMetrics()
    producer = Producer(state, executor, metrics)
    mock_ws = MockWebSocket()

    # Send multiple frames rapidly while consumer is busy
    test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    success, jpeg_bytes = cv2.imencode(".jpg", test_image)

    tasks = []
    for i in range(5):
        message = {"jpeg_blob": jpeg_bytes.tobytes(), "new_word_letter": None}
        task = asyncio.create_task(producer.handle_message(message, mock_ws))
        tasks.append(task)

    await asyncio.gather(*tasks, return_exceptions=True)

    stats = metrics.get_stats()
    print(f"   Dropped frames: {stats['dropped_frames']}")
    print(f"   Drop rate: {stats['drop_rate']}%")

    executor.shutdown(wait=False)


async def main():
    await test_helpers()
    await test_metrics()
    await test_full_pipeline()
    await test_emergency_reset_during_processing()
    await test_backpressure()


print("\nRunning async integration tests...")
asyncio.run(main())

print("\n" + "=" * 50)
print("Phase 3 Integration tests completed!")
