# Opens a local port-forward through the jump host so local dev can reach the
# production Postgres container (172.19.0.2:5432 inside ai_trade_net, not published
# to the host's public interface) at localhost:15432. Keep this running in its own
# terminal while running `npm run dev:local` in another.
ssh -o ProxyJump=root@reg.arcai.com -N -L 15432:172.19.0.2:5432 root@172.105.9.107
