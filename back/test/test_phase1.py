import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.state import PipelineState
from utils.metrics import extract_metrics, index_to_char, char_to_index

print("Testing Phase 1 Implementation")
print("=" * 50)

print("\n1. Testing index_to_char and char_to_index:")
print(f"   index_to_char(0) = {index_to_char(0)} (expected: A)")
print(f"   index_to_char(1) = {index_to_char(1)} (expected: B)")
print(f"   index_to_char(25) = {index_to_char(25)} (expected: Z)")
print(f"   char_to_index('A') = {char_to_index('A')} (expected: 0)")
print(f"   char_to_index('B') = {char_to_index('B')} (expected: 1)")
print(f"   char_to_index('Z') = {char_to_index('Z')} (expected: 25)")

print("\n2. Testing extract_metrics:")
prob_dist = [0.01] * 26
prob_dist[1] = 0.95
maxarg, target_prob = extract_metrics(prob_dist, "B")
print(f"   maxarg_letter: {maxarg} (expected: B)")
print(f"   target_arg_prob: {target_prob} (expected: 0.95)")

print("\n3. Testing PipelineState initialization:")
state = PipelineState()
print(f"   Keypoint buffer size: {len(state.keypoint_buffer)}/32")
print(f"   Smoothing buffer size: {len(state.smoothing_buffer)}/5")
print(f"   Current target letter: {state.current_target_letter}")

print("\n4. Testing buffer append:")
for i in range(35):
    state.keypoint_buffer.append(f"frame_{i}")
print(f"   After appending 35 items, buffer size: {len(state.keypoint_buffer)}/32")
print(f"   Buffer is_full: {state.keypoint_buffer.is_full()}")

print("\n5. Testing reset:")
state.reset("C")
print(f"   After reset, keypoint buffer size: {len(state.keypoint_buffer)}/32")
print(f"   After reset, smoothing buffer size: {len(state.smoothing_buffer)}/5")
print(f"   After reset, target letter: {state.current_target_letter}")

print("\n6. Testing buffer get_all (when not full):")
state.keypoint_buffer.append("item1")
state.keypoint_buffer.append("item2")
result = state.keypoint_buffer.get_all()
print(f"   get_all() with 2/32 items: {result} (expected: None)")

print("\n" + "=" * 50)
print("Phase 1 tests completed successfully!")
