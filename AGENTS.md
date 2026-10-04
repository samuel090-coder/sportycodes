# Architecture rules
- VIP wallet purchases and cancellations use authenticated database functions; purchases lock the wallet and use idempotency references to avoid partial or duplicate charges.
- VIP renewal purchases retain history and extend the furthest active expiry; access checks prefer an unexpired active subscription over pending or historical rows.
- Reels use native vertical scroll snapping with only the active video playing and adjacent media preloaded; existing social and upload flows remain in Shorts.
- Feature-specific styling is scoped to the membership and reels pages so existing screens retain their design.
