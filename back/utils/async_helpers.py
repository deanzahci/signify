import base64
import json
from typing import Any, Dict, Optional


def validate_message(message: Any) -> Optional[Dict]:
    """
    Validate incoming WebSocket message format.

    Expected format:
    {
        "jpeg_blob": base64 string or bytes,
        "new_word_letter": str or null
    }

    Returns:
        Validated dict with jpeg_blob as bytes, or None if invalid
    """
    if isinstance(message, str):
        try:
            data = json.loads(message)
        except json.JSONDecodeError:
            return None
    elif isinstance(message, dict):
        data = message
    else:
        return None

    if "jpeg_blob" not in data:
        return None

    jpeg_blob = data["jpeg_blob"]

    if isinstance(jpeg_blob, str):
        try:
            jpeg_blob = base64.b64decode(jpeg_blob)
        except Exception:
            return None
    elif not isinstance(jpeg_blob, bytes):
        return None

    new_word_letter = data.get("new_word_letter", None)

    if new_word_letter is not None and not isinstance(new_word_letter, str):
        return None

    if new_word_letter is not None and len(new_word_letter) != 1:
        return None

    return {"jpeg_blob": jpeg_blob, "new_word_letter": new_word_letter}


def format_response(maxarg_letter: str, target_arg_prob: float) -> str:
    """
    Format response for WebSocket transmission.

    Args:
        maxarg_letter: Predicted letter (A-Z)
        target_arg_prob: Confidence score (0.0-1.0)

    Returns:
        JSON string
    """
    response = {
        "detected_word_letter": maxarg_letter,
        "target_word_prob": 0.0,
        "target_lettr_prob": round(target_arg_prob, 4),
    }
    return json.dumps(response)


def format_error_response(error_message: str) -> str:
    """
    Format error response for WebSocket transmission.

    Args:
        error_message: Error description

    Returns:
        JSON string with error field
    """
    response = {"error": error_message}
    return json.dumps(response)
