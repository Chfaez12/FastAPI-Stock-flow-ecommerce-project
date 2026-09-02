import logging
from typing import Any
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.exceptions.custom_exceptions import StockFlowException

logger = logging.getLogger("stockflow.exceptions")


def format_error_response(
    status_code: int,
    message: str,
    details: Any = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:

    response_headers = headers or {}
    if status_code == status.HTTP_401_UNAUTHORIZED and "WWW-Authenticate" not in response_headers:
        response_headers["WWW-Authenticate"] = "Bearer"

    return JSONResponse(
        status_code=status_code,
        headers=response_headers,
        content={
            "success": False,
            "error": {
                "code": status_code,
                "message": message,
                "details": details,
            },
        },
    )


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(StockFlowException)
    async def stockflow_exception_handler(request: Request, exc: StockFlowException):
        logger.warning(f"Business exception on {request.method} {request.url.path}: {exc.message}")
        return format_error_response(
            status_code=exc.status_code,
            message=exc.message,
            details=exc.details,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.warning(f"HTTP exception on {request.method} {request.url.path}: {exc.detail}")
        return format_error_response(
            status_code=exc.status_code,
            message=str(exc.detail),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = [
            {
                "field": " -> ".join(str(loc) for loc in err.get("loc", [])),
                "issue": err.get("msg"),
                "type": err.get("type"),
            }
            for err in exc.errors()
        ]
        logger.info(f"Validation failure on {request.method} {request.url.path}: {errors}")
        return format_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Input validation failed.",
            details=errors,
        )

    @app.exception_handler(Exception)
    async def global_unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled server crash on {request.method} {request.url.path}: {str(exc)}")
        return format_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="An unexpected internal server error occurred. Please contact support.",
        )