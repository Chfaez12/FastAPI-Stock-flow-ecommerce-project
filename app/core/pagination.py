import math
from dataclasses import dataclass

from fastapi import Query
from sqlalchemy import func, select
from sqlalchemy.orm import Query as OrmQuery

MAX_PAGE_SIZE = 100


@dataclass
class PageParams:
    page: int
    size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


def page_params(
    page: int = Query(1, ge=1, description="1-based page number"),
    size: int = Query(20, ge=1, le=MAX_PAGE_SIZE, description="Items per page"),
) -> PageParams:
    return PageParams(page=page, size=size)


def like_pattern(term: str) -> str:
    """Build a `%term%` pattern for ILIKE with the wildcards in `term` escaped (use escape='\\')."""
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def paginate(query: OrmQuery, params: PageParams, items_transform=None) -> dict:
    """
    Run `query` for one page and return the Page envelope as a dict.

    The total is counted on the query with its ORDER BY removed, so sorting costs nothing extra.
    `items_transform` maps the fetched rows (e.g. to attach computed fields) before they are returned.
    """
    total = query.session.execute(
        select(func.count()).select_from(query.order_by(None).subquery())
    ).scalar_one()
    rows = query.limit(params.size).offset(params.offset).all()
    items = items_transform(rows) if items_transform else rows
    return {
        "items": items,
        "total": total,
        "page": params.page,
        "size": params.size,
        "pages": math.ceil(total / params.size) if total else 0,
    }
