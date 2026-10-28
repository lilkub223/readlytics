from typing import Annotated

from uuid import UUID

import jwt
from fastapi import Depends, Header, HTTPException, status

from app.config import settings


def get_current_user_id(authorization: Annotated[str | None, Header()] = None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token.")

    token = authorization[len("Bearer ") :]

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], options={"require": ["exp", "sub"]})
    except jwt.InvalidTokenError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is invalid or expired. Please sign in again.") from error

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject.")

    try:
        UUID(user_id)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid token subject.")
    return user_id


CurrentUserId = Annotated[str, Depends(get_current_user_id)]
