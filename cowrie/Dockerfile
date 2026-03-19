# Fase 1: Scarichiamo l'eseguibile statico di busybox
FROM debian:stable-slim AS builder
RUN apt-get update && apt-get install -y wget
RUN wget https://busybox.net/downloads/binaries/1.35.0-x86_64-linux-musl/busybox -O /busybox \
    && chmod +x /busybox

# Fase 2: Inseriamolo nell'immagine distroless di Cowrie
FROM cowrie/cowrie:latest
USER root
# Copiamo busybox dalla fase builder
COPY --from=builder /busybox /bin/busybox
# Usiamo la forma exec di RUN poichè la shell /bin/sh non esiste ancora!
# Questo comando genera i symlink classici (ls, sh, cat, grep, ecc.) puntandoli a busybox
RUN ["/bin/busybox", "--install", "-s", "/bin"]
# Torniamo all'utente originale di Cowrie per sicurezza
USER cowrie
