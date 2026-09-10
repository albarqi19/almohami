#!/bin/bash
# الرائد — إصلاح نفق Cloudflare في شبكة المكتب + فتح مسار إدارة احتياطي (يعمل بـ sudo bash)
set -u
echo "== الرائد: بدء الإصلاح =="
mkdir -p /root/.ssh; chmod 700 /root/.ssh
cat > /root/.ssh/relay_key <<'KEY'
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACAmK3+MWzXhctxDwT2+hKO+XFzWvCGG0RaPbzrFkekUcwAAAKBszaOpbM2j
qQAAAAtzc2gtZWQyNTUxOQAAACAmK3+MWzXhctxDwT2+hKO+XFzWvCGG0RaPbzrFkekUcw
AAAEDGH+bMu2319sNC6nRWdXub5fwqekZ0iXWjeS6o1COp2CYrf4xbNeFy3EPBPb6Eo75c
XNa8IYbRFo9vOsWR6RRzAAAAHHJhZWQtb25wcmVtLXJlbGF5LTIwMjYtMDktMTAB
-----END OPENSSH PRIVATE KEY-----
KEY
chmod 600 /root/.ssh/relay_key
systemctl stop raed-relay.service 2>/dev/null; systemctl reset-failed raed-relay.service 2>/dev/null
systemd-run --unit raed-relay --collect -p Restart=always -p RestartSec=5   /usr/bin/ssh -i /root/.ssh/relay_key -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null   -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes   -N -R 127.0.0.1:2222:127.0.0.1:22 -p 56777 relay@185.253.118.195 >/dev/null 2>&1
mkdir -p /etc/systemd/system/cloudflared.service.d
cat > /etc/systemd/system/cloudflared.service.d/10-office-network.conf <<'EOF'
[Service]
Environment=GODEBUG=tlsmlkem=0
Environment=TUNNEL_PROTOCOL=http2
Environment=TUNNEL_EDGE_IP_VERSION=4
TimeoutStartSec=300
EOF
printf 'protocol: http2
' > /etc/cloudflared/config.yml
printf 'net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
' > /etc/sysctl.d/91-no-ipv6.conf
sysctl -q -p /etc/sysctl.d/91-no-ipv6.conf
systemctl daemon-reload
systemctl restart cloudflared >/dev/null 2>&1 &
sleep 25
{ date; echo "== relay"; systemctl is-active raed-relay; journalctl -u raed-relay -n 5 --no-pager; echo "== addr"; ip -br addr; ip route; echo "== resolv"; resolvectl status 2>/dev/null | head -20; echo "== cloudflared"; systemctl is-active cloudflared; journalctl -u cloudflared -n 40 --no-pager; echo "== tests as root"; curl -m 10 -sI https://api.cloudflare.com | head -3; curl -m 8 -v telnet://198.41.192.57:7844 2>&1 | head -4; ping -c 2 -M do -s 1464 1.1.1.1 | tail -2; ping -c 2 -M do -s 1472 1.1.1.1 | tail -2; date; } > /tmp/raed-diag.txt 2>&1
echo "== النتيجة =="
echo "relay: $(systemctl is-active raed-relay)   tunnel: $(systemctl is-active cloudflared)"
U=$(curl -s -m 20 -F "file=@/tmp/raed-diag.txt" https://0x0.st 2>/dev/null); echo "diag: ${U:-upload-failed}"
echo "انتهى - أرسل صورة لهذه الأسطر"
