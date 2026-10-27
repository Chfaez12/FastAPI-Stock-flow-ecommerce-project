import React, { useMemo, useState } from 'react';
import { LayoutGrid, List, PackageSearch } from 'lucide-react';
import { CategoryService, ProductService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { useDebounced } from '../../lib/useDebounced';
import { useAuth } from '../../context/AuthContext';
import { ProductCard } from '../../components/ProductCard';
import { SearchInput } from '../../components/ui/Common';
import { EmptyState, ErrorState } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
import type { ProductSort } from '../../types/api';

type View = 'grid' | 'list';
const PAGE_SIZE = 12;

export const Shop: React.FC = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  // Any filter change starts again from the first page.
  const resetting =
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };
  const [categoryId, setCategoryIdState] = useState<string>('');
  const [query, setQueryState] = useState('');
  const [sort, setSortState] = useState<ProductSort>('featured');
  const [inStockOnly, setInStockOnlyState] = useState(false);
  const [minPrice, setMinPriceState] = useState('');
  const [maxPrice, setMaxPriceState] = useState('');
  const setCategoryId = resetting(setCategoryIdState);
  const setQuery = resetting(setQueryState);
  const setSort = resetting(setSortState);
  const setInStockOnly = resetting(setInStockOnlyState);
  const setMinPrice = resetting(setMinPriceState);
  const setMaxPrice = resetting(setMaxPriceState);
  const [view, setViewState] = useState<View>(() => {
    try {
      return localStorage.getItem('sf_shop_view') === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem('sf_shop_view', v);
    } catch {
      /* storage unavailable */
    }
  };

  const categories = useAsync(() => CategoryService.getAll().then((r) => r.data), []);

  // Typing shouldn't fire a request per keystroke.
  const search = useDebounced(query.trim());
  const min = useDebounced(minPrice);
  const max = useDebounced(maxPrice);

  // Search, filters, sorting and paging all run server-side through GET /products.
  const products = useAsync(
    () =>
      ProductService.list({
        page,
        size: PAGE_SIZE,
        status: 'ACTIVE',
        sort,
        search: search || undefined,
        category_id: categoryId || undefined,
        in_stock: inStockOnly || undefined,
        min_price: min ? Number(min) : undefined,
        max_price: max ? Number(max) : undefined,
      }).then((r) => r.data),
    [page, categoryId, search, sort, inStockOnly, min, max],
  );

  const categoryName = useMemo(() => {
    const map = new Map<string, string>();
    categories.data?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories.data]);

  const visible = products.data?.items ?? [];
  const hasFilters = !!(query || inStockOnly || categoryId || minPrice || maxPrice);
  const clearFilters = () => {
    setQuery('');
    setInStockOnly(false);
    setCategoryId('');
    setMinPrice('');
    setMaxPrice('');
  };

  const changePage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <section className="hero">
        <h1>Hi {user?.name.split(' ')[0]}, find something you'll love.</h1>
        <p>Live stock levels, transparent pricing, and order tracking from checkout to your door.</p>
      </section>

      {categories.data && categories.data.length > 0 && (
        <div className="chips" style={{ marginBottom: 20 }}>
          <button className={`chip ${categoryId === '' ? 'active' : ''}`} onClick={() => setCategoryId('')}>
            All products
          </button>
          {categories.data.map((c) => (
            <button
              key={c.id}
              className={`chip ${categoryId === c.id ? 'active' : ''}`}
              onClick={() => setCategoryId(c.id)}
              title={c.description ?? undefined}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="shop-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search products, SKUs…" />
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="price-range" role="group" aria-label="Price range">
            <input
              className="input"
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="Min $"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              aria-label="Minimum price"
            />
            <span className="subtle">–</span>
            <input
              className="input"
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="Max $"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              aria-label="Maximum price"
            />
          </div>
          <label className="row muted" style={{ cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
            In stock only
          </label>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as ProductSort)} aria-label="Sort products">
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="rating">Top rated</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name_asc">Name A–Z</option>
          </select>
          <div className="view-toggle" role="group" aria-label="Layout">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'}>
              <LayoutGrid />
            </button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'}>
              <List />
            </button>
          </div>
        </div>
      </div>

      {products.error ? (
        <div className="card">
          <ErrorState message={products.error} onRetry={() => products.reload()} />
        </div>
      ) : products.loading && !products.data ? (
        <div className="product-grid">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card" style={{ overflow: 'hidden' }}>
              <div className="stack-sm" style={{ padding: 16 }}>
                <div className="skeleton" style={{ height: 44, width: 44, borderRadius: 10 }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
                <div className="skeleton" style={{ height: 16, width: '80%' }} />
                <div className="skeleton" style={{ height: 20, width: '30%', marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            description={query ? `Nothing matches "${query}". Try a different search.` : 'There are no products here yet. Check back soon.'}
            action={
              hasFilters && (
                <button className="btn btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              )
            }
          />
        </div>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
            {products.data!.total} {products.data!.total === 1 ? 'product' : 'products'}
          </p>
          <div className={`${view === 'grid' ? 'product-grid' : 'product-list'} ${products.loading ? 'is-refreshing' : ''}`}>
            {visible.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                layout={view}
                categoryName={p.category_id ? categoryName.get(p.category_id) : undefined}
              />
            ))}
          </div>
          <Pagination
            page={products.data!.page}
            pages={products.data!.pages}
            total={products.data!.total}
            size={products.data!.size}
            onChange={changePage}
            noun="products"
          />
        </>
      )}
    </>
  );
};
