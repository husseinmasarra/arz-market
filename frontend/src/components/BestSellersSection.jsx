import React, { useEffect, useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { Flame, ChevronLeft, ChevronRight } from "lucide-react";

export default function BestSellersSection({ onProductClick }) {
  const { lang, apiBase, apiHost, formatPrice } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        const res = await fetch(apiBase + "/products/best-sellers?limit=10");
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (err) {
        console.error("Best sellers fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBestSellers();
  }, [apiBase]);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
    }
  };

  if (loading || products.length === 0) return null;

  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Flame size={20} color="#ef4444" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0, color: "var(--text-primary)" }}>
              {lang === "ar" ? "الأكثر مبيعاً" : "Best Sellers"}
            </h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-light)", margin: 0 }}>
              {lang === "ar" ? "المنتجات الأكثر طلباً من زبائننا" : "Most ordered products by our customers"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => scroll("left")} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll("right")} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div ref={scrollRef} style={{ display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "8px", scrollbarWidth: "none" }}>
        {products.map((p, idx) => {
          if (!p) return null;
          const name = (lang === 'ar' ? p.name_ar : p.name_en) || p.name_ar || p.name_en || 'Product';
          const rawImg = p.image_url;
          const imageUrl = (typeof rawImg === 'string' && rawImg.trim().length > 0)
            ? (rawImg.startsWith('http') || rawImg.startsWith('data:') ? rawImg : `${apiHost}${rawImg}`)
            : 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=300&q=80';
          return (
            <div key={p.id} onClick={() => onProductClick && onProductClick(p)} style={{ minWidth: "160px", maxWidth: "160px", backgroundColor: "var(--bg-secondary)", borderRadius: "14px", border: "1px solid var(--border-color)", overflow: "hidden", cursor: "pointer", transition: "transform 0.2s ease", flexShrink: 0, position: "relative" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ position: "absolute", top: "8px", left: "8px", zIndex: 2, width: "24px", height: "24px", borderRadius: "50%", backgroundColor: idx === 0 ? "#f59e0b" : idx === 1 ? "#9ca3af" : idx === 2 ? "#b45309" : "rgba(239,68,68,0.85)", color: "white", fontSize: "0.7rem", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</div>
              {idx < 3 && <div style={{ position: "absolute", top: "8px", right: "8px", zIndex: 2, backgroundColor: "rgba(239,68,68,0.9)", color: "white", fontSize: "0.62rem", fontWeight: "800", padding: "2px 6px", borderRadius: "8px" }}>HOT</div>}
              <div style={{ width: "100%", height: "130px", overflow: "hidden", backgroundColor: "var(--bg-primary)" }}>
                <img src={imageUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ padding: "10px" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 6px", lineHeight: "1.3", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{name}</p>
                <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--accent-red-gold)" }}>{formatPrice(p.price_usd)}</div>
                {p.total_sold > 0 && <div style={{ fontSize: "0.68rem", color: "var(--text-light)", marginTop: "3px" }}>{lang === "ar" ? p.total_sold + " مبيعة" : p.total_sold + " sold"}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
