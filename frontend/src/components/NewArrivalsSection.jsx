import React, { useEffect, useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

export default function NewArrivalsSection({ onProductClick }) {
  const { lang, apiBase, apiHost, formatPrice } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        const res = await fetch(apiBase + "/products/new-arrivals-home?limit=10");
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (err) {
        console.error("New arrivals fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNewArrivals();
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
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(37,99,235,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={20} color="#2563eb" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0, color: "var(--text-primary)" }}>
              {lang === "ar" ? "✨ وصل حديثاً" : "✨ New Arrivals"}
            </h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-light)", margin: 0 }}>
              {lang === "ar" ? "أحدث المنتجات المضافة لمتجرنا" : "The latest products added to our store"}
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
        {products.map((p) => {
          const name = lang === "ar" ? p.name_ar : p.name_en;
          const imageUrl = p.image_url ? (p.image_url.startsWith("http") || p.image_url.startsWith("data:") ? p.image_url : apiHost + p.image_url) : "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=300&q=80";
          const hasDiscount = p.old_price_usd && p.old_price_usd > p.price_usd;
          return (
            <div key={p.id} onClick={() => onProductClick && onProductClick(p)} style={{ minWidth: "160px", maxWidth: "160px", backgroundColor: "var(--bg-secondary)", borderRadius: "14px", border: "1px solid var(--border-color)", overflow: "hidden", cursor: "pointer", transition: "transform 0.2s ease", flexShrink: 0, position: "relative" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ position: "absolute", top: "8px", left: "8px", zIndex: 2, backgroundColor: "rgba(37,99,235,0.9)", color: "white", fontSize: "0.62rem", fontWeight: "800", padding: "2px 7px", borderRadius: "8px" }}>
                {lang === "ar" ? "✨ جديد" : "✨ NEW"}
              </div>
              {hasDiscount && <div style={{ position: "absolute", top: "8px", right: "8px", zIndex: 2, backgroundColor: "rgba(16,185,129,0.9)", color: "white", fontSize: "0.62rem", fontWeight: "800", padding: "2px 6px", borderRadius: "8px" }}>خصم</div>}
              <div style={{ width: "100%", height: "130px", overflow: "hidden", backgroundColor: "var(--bg-primary)" }}>
                <img src={imageUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ padding: "10px" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 6px", lineHeight: "1.3", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--accent-red-gold)" }}>{formatPrice(p.price_usd)}</span>
                  {hasDiscount && <span style={{ fontSize: "0.7rem", color: "var(--text-light)", textDecoration: "line-through" }}>{formatPrice(p.old_price_usd)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
