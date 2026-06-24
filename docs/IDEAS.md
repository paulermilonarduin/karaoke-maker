# Idées produit

## Discord Activity pour le player

Créer une Discord Activity basée sur le player web pour permettre à plusieurs personnes de lancer un karaoké directement dans Discord.

Vision V1 :

- Héberger une version web HTTPS du player.
- Créer une application Discord avec l’Embedded App SDK.
- Charger un fichier karaoke JSON depuis un catalogue ou une URL.
- Demander à chaque utilisateur de charger son MP3 localement.
- Synchroniser uniquement l’état de lecture entre participants :
  - chanson sélectionnée ;
  - play / pause ;
  - timestamp ;
  - seek ;
  - vitesse ;
  - offset local.

Point produit important :

- Ne pas uploader ou redistribuer les MP3 pour éviter les problèmes de droits.
- Partager uniquement les fichiers lyrics/karaoke JSON.
- Chaque utilisateur reste responsable de fournir son propre fichier audio local.

Risques techniques :

- Dérive audio entre participants.
- Latence réseau.
- MP3 locaux pas strictement identiques.
- Offset différent selon l’utilisateur.
- Besoin d’un état partagé fiable pour la session.
- Hébergement HTTPS obligatoire pour l’activité.

Approche recommandée :

1. Stabiliser le player web et le format JSON.
2. Faire un POC Discord Activity séparé du desktop.
3. Ajouter la synchronisation host/client.
4. Ajouter un offset local par participant.
5. Évaluer si une API backend est nécessaire pour gérer les sessions partagées.
