from typing import Any


class StockFlowException(Exception):
    
    def __init__(self, message: str, status_code: int = 400, details: Any = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class ResourceNotFoundException(StockFlowException):
    def __init__(self, resource: str, identifier: str | int):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' was not found.",
            status_code=404,
        )


class ResourceAlreadyExistsException(StockFlowException):
    def __init__(self, resource: str, field: str, value: str):
        super().__init__(
            message=f"{resource} with {field} '{value}' already exists.",
            status_code=409,
        )


class InsufficientStockException(StockFlowException):
    def __init__(self, product_name: str, available: int, requested: int):
        super().__init__(
            message=(
                f"Insufficient stock for product '{product_name}'. "
                f"Available: {available}, Requested: {requested}."
            ),
            status_code=400,
            details={"available": available, "requested": requested},
        )


class InvalidWorkflowStateException(StockFlowException):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=400)


class AuthenticationFailedException(StockFlowException):
    def __init__(self, message: str = "Invalid authentication credentials."):
        super().__init__(message=message, status_code=401)


class PermissionDeniedException(StockFlowException):
    def __init__(self, message: str = "Access forbidden. Insufficient permissions."):
        super().__init__(message=message, status_code=403)