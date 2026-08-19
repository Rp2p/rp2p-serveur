const http = require('http');

const PORT = process.env.PORT || 3000;
const SECRET_TOKEN = 'RP2P_TOKEN_SECURE_2026';
const AGENT_SECRET_ATTENDU = 'RP2P-SOUVERAIN-PORTAL-2026';

let annuaireRelais = [];

const server = http.createServer((req, res) => {
  // En-têtes de sécurité CORS absolus pour ton application Electron
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RP2P-Signature');

  // ✅ CORRECTION DU VERROU 405 : Si Electron envoie une vérification OPTIONS, on répond instantanément SUCCESS (200)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 🛡️ VERROU STRICT : On rejette tout ce qui n'est pas du POST (GET, PUT, etc.)
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Methode non autorisee sur cette frequence.' }));
    return;
  }

  // 🛡️ VERROU 1 : Vérification de la signature secrète de ta carte réseau
  const agentRecu = req.headers['x-rp2p-signature'];
  if (agentRecu !== AGENT_SECRET_ATTENDU) {
    res.writeHead(403);
    res.end(JSON.stringify({ error: 'Erreur System : Terminal non identifie. Rejet instantane.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const input = JSON.parse(body);
      const userIp = req.socket.remoteAddress.replace(/^.*:/, ''); // Détection de l'IP réelle par le serveur

      // 🛡️ VERROU 3 : Contrôle du jeton de sécurité
      if (!input.token || input.token !== SECRET_TOKEN) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Jeton reseau invalide ou expire.' }));
        return;
      }

      // Traitement de l'Alias actif (on nettoie l'ancienne présence pour éviter les doublons)
      if (input.username && input.alias) {
        annuaireRelais = annuaireRelais.filter(node => node.username !== input.username);
        annuaireRelais.push({
          username: input.username,
          alias: input.alias,
          ip: userIp,
          port: input.port || 9878,
          derniere_puce: Date.now()
        });
      }

      // Nettoyage automatique après 60 secondes d'inactivité
      const tempsLimite = Date.now() - 60000;
      annuaireRelais = annuaireRelais.filter(node => node.derniere_puce > tempsLimite);

      // Renvoi sécurisé à l'application Electron
      res.writeHead(200);
      res.end(JSON.stringify(annuaireRelais));

    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Paquet mal forme.' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Serveur central RP2P en ligne sur le port ${PORT}`);
});
