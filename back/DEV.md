Separate all parameters and put it in the config.py
Use Python 3.11.

## **Revised Technical Specification: Real-Time Sign Language Recognition Pipeline**

This specification outlines the real-time backend architecture for a sign language recognition system. The architecture employs an **asynchronous Producer-Consumer pattern** to decouple high-frequency WebSocket input from the compute-intensive inference pipeline. This design ensures immediate responsiveness to user state changes (e.g., new target characters) by enabling task cancellation and rapid context switching.

## **1\. WebSocket Interface & Data Protocol**

**Connection:**  
Establish a persistent WebSocket connection. The client continuously streams JSON payloads containing the current video frame and any user state updates.

**Input Payload Structure:**

json  
`{`  
 `"jpeg_blob": "<binary_jpeg_data>",`  
 `"new_letter": "<char | null>"`  
`}`

- `jpeg_blob`: Binary JPEG image data captured from the user's camera.
- `new_letter`: `null` by default. Sends a non-null character code only when the user successfully completes a sign and advances to the next target character.

---

## **2\. Backend Architecture: Producer-Consumer Model**

The backend processes requests using two concurrent asynchronous tasks: a **Producer (Input Handler)** and a **Consumer (Inference Pipeline)**.

**A. Producer (Input Handler)**

- Continuously listens for incoming WebSocket messages.
- **Emergency Reset (Trigger: `new_letter` is non-null):**
  - **Immediate Cancellation:** Instantly cancels the currently running Consumer task (inference pipeline), discarding any partial calculations for the old character.
  - **State Reset:** Clears all internal buffers (LSTM input buffer, Sliding Window history) and updates the `current_target_letter`.
  - **Feedback:** (Optional) Immediately sends a "0% confidence" payload to the client to reflect the reset state.
- **Standard Processing (Trigger: `new_letter` is null):**
  - If the Consumer is idle (previous task complete), spawns a new Consumer task for the current frame.
  - If the Consumer is busy, drops the current frame (Backpressure handling) to prevent lag accumulation, ensuring the system always processes the latest available data.

**B. Consumer (Inference Pipeline)**

- Executes the CPU-bound processing steps (below) in a separate thread pool executor to avoid blocking the main event loop.

**Pipeline Steps:**

1. **Preprocessing:**
   - Decode `jpeg_blob` directly into a NumPy array (RGB format).
   - Pass the array to the **MediaPipe Holistic** model to extract keypoints.
2. **Feature Engineering & Inference:**
   - **Buffering:** Append keypoints to a rolling buffer (FIFO).
   - **Wait Condition:** If the buffer size \< 32 (e.g., immediately after a reset), abort inference for this frame and wait for more data.
   - **Inference:** Once the buffer is full (32 frames), convert the sequence to a PyTorch tensor and pass it to the **LSTM model** to generate a probability distribution.
3. **Temporal Smoothing (Post-Processing):**
   - Append the output distribution to a **Sliding Window** history (e.g., last 5 frames).
   - Compute the **averaged probability distribution** to stabilize the output and reduce jitter.
4. **Metrics Extraction:**
   - `maxarg_letter`: The character class with the highest probability in the averaged distribution.
   - `target_arg_prob`: The probability score of the _current target character_ extracted from the averaged distribution.

---

## **3\. Intelligent Feedback Throttling System**

To balance real-time responsiveness with network efficiency, the backend determines whether to send a response based on **Minimum Frequency** and **Probability Change**.

**Decision Logic:**  
Send a response **ONLY IF**:

1. **Time Elapsed:** The time since the last transmission exceeds the defined minimum interval (e.g., 50-100ms).
   - _AND_
2. **Significant Change:** The `target_arg_prob` has changed by more than a defined threshold (e.g., \>2-5%) OR the `maxarg_letter` has changed.

_(Note: The "Emergency Reset" step bypasses these checks to ensure instant feedback when the target letter changes.)_

---

## **4\. Output Protocol**

**Output Payload Structure:**

json  
`{`  
 `"maxarg_letter": "<char>",`  
 `"target_arg_prob": <float 0.0-1.0>`  
`}`

- `maxarg_letter`: The system's best guess for the current sign.
- `target_arg_prob`: A confidence score indicating how close the user's sign is to the correct target. Used to drive UI feedback

