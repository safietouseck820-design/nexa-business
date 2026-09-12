# NEXA V55 — Sécurité production

Cette version renforce la base V54 avant un déploiement public.

## Ajouts
- En-têtes HTTP de sécurité : CSP, HSTS en production, anti-sniffing, anti-clickjacking, Referrer-Policy, Permissions-Policy et politiques Cross-Origin.
- Protection des requêtes d'écriture par contrôle d'origine et `Content-Type: application/json`.
- Limite de taille des requêtes JSON à 8 MiB.
- Sessions avec expiration absolue de 7 jours et expiration d'inactivité de 2 heures.
- Nettoyage périodique des sessions expirées.
- Limitation des tentatives d'authentification renforcée.
- Réponse d'inscription moins révélatrice pour limiter l'énumération de comptes.
- Cache contrôlé : HTML/API non mis en cache, assets statiques cacheables.
- Erreurs serveur génériques côté client.

## Limites restantes
Le stockage JSON et les sessions en mémoire restent adaptés au prototype/à une pré-production, pas à une charge publique importante. Avant un vrai lancement, migrer vers une base de données de production et un store de sessions durable, puis effectuer un audit de sécurité indépendant.

## Important
La CSP conserve `unsafe-inline` parce que l'interface actuelle utilise encore des gestionnaires `onclick`/`oninput` inline. Une future refactorisation vers des listeners JavaScript permettra de supprimer cette exception et de renforcer davantage la CSP.
