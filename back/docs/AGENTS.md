# Build/Test/Run Commands

- Use UV not pip: `uv run python <script>`, `uv pip install <package>`
- Run all tests: `uv run python run_tests.py`
- Run single test: `uv run python test/test_<name>.py` or `python test/test_<name>.py`
- Start server: `./start_server.sh` or `uv run python main.py`

# Code Style

- Don't use any emojis in code or output
- Python 3.11+ required
- Imports: stdlib, third-party, local (app/services/utils/config), alphabetical within groups
- Type hints: Use typing.Optional, typing.List, typing.Dict for parameters and returns
- Docstrings: Google style for public functions (see utils/async_helpers.py for examples)
- Naming: snake_case for functions/variables, PascalCase for classes, UPPER_CASE for constants
- Error handling: Try-except with logging, return None or uniform fallback on errors
- Logging: Use logging.getLogger(**name**), levels: debug for verbose, info for key events, error for failures
- Async: Use asyncio, ThreadPoolExecutor for CPU-bound tasks, see Consumer.\_run_in_executor pattern

# Architecture

- Services pattern: PreprocessingService, InferenceService, SmoothingService (stateless)
- State in PipelineState: keypoint_buffer (32), smoothing_buffer (5), current_target_letter
- Config constants in config.py, import and use directly
- WebSocket handler in main.py, processing pipeline in Consumer

