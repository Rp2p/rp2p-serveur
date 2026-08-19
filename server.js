const http = require('http');

const PORT = process.env.PORT || 3000;
const SECRET_TOKEN = 'RP2P_TOKEN_SECURE_2026';
const AGENT_SECRET_ATTENDU = 'RP2P-SOUVERAIN-PORTAL-2026';

let tableConnectes = []; // Notre annuaire unique en mémoire vive

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RP2P-Signature');

  if (req.method === 'OPTIONS') {
    res.writeHead(200); res.end(); return;
  }

  const agentRecu = req.headers['x-rp2p-signature'];
  if (req.method !== 'POST' || agentRecu !== AGENT_SECRET_ATTENDU) {
    res.writeHead(403); res.end(JSON.stringify({ error: 'Terminal non identifie.' })); return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const input = JSON.parse(body);

      if (!input.token || input.token !== SECRET_TOKEN) {
        res.writeHead(403); res.end(JSON.stringify({ error: 'Jeton invalide.' })); return;
      }

      // 1. MISE À JOUR : On écoute le cri de la machine (Sans stocker l'IP)
      if (input.username && input.alias) {
        tableConnectes = tableConnectes.filter(u => u.username !== input.username);
        tableConnectes.push({
          username: input.username,
          alias: input.alias,
          port: input.port || 9878,
          timestamp: Date.now() // Marqueur de temps pour les 33 secondes
        });
      }

      // 2. NETTOYAGE STRICT (33 SECONDES) : Si inactif depuis > 33 secondes, on supprime
      const limiteHeure = Date.now() - 33000;
      tableConnectes = tableConnectes.filter(u => u.timestamp > limiteHeure);

      // 3. RÉPONSE SIMULTANÉE : On renvoie la liste épurée
      res.writeHead(200);
      res.end(JSON.stringify(tableConnectes));

    } catch (e) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'Paquet mal forme.' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Fichier central RP2P actif sans IP sur le port ${PORT}`);
});
