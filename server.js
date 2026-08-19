const http = require('http');

const PORT = process.env.PORT || 3000;
const SECRET_TOKEN = 'RP2P_TOKEN_SECURE_2026';
const AGENT_SECRET_ATTENDU = 'RP2P-SOUVERAIN-PORTAL-2026';

let tableConnectes = []; // Notre registre unique en RAM

const server = http.createServer((req, res) => {
  // ✅ EN-TÊTES CORS BLINDÉS : Autorise absolument toutes les connexions d'Electron
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RP2P-Signature');

  // ✅ VALIDATION DU PREFLIGHT : Répond SUCCESS (200) instantanément aux requêtes de contrôle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 🛡️ VERROU STRICT DE MÉTHODE : Rejette instantanément tout ce qui n'est pas du POST (GET, etc.)
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Methode non autorisee sur cette frequence.' }));
    return;
  }

  // 🛡️ VERROU DE SIGNATURE : Vérification de l'agent secret attendu
  const agentRecu = req.headers['x-rp2p-signature'];
  if (agentRecu !== AGENT_SECRET_ATTENDU) {
    res.writeHead(403);
    res.end(JSON.stringify({ error: 'Terminal non identifie. Rejet instantane.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {












             try {
      const input = JSON.parse(body);

      // 🛡️ VERROU DE JETON : Contrôle du jeton de sécurité
      if (!input.token || input.token !== SECRET_TOKEN) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Jeton reseau invalide ou expire.' }));
        return;
      }

      // ⏱️ NETTOYAGE STRICT (33 SECONDES) : On supprime d'abord les morts du registre mondial
      const limiteHeure = Date.now() - 33000;
      tableConnectes = tableConnectes.filter(u => u.timestamp > limiteHeure);

      // 🟢 LA LOGIQUE SOUVERAINE ADMIN DE LECTURE SEULE
      if (input.action === "READ_ONLY") {
        res.writeHead(200);
        res.end(JSON.stringify(tableConnectes));
        return;
      }

      // 👤 LOGIQUE UTILISATEUR NORMAL : Inscription / Pulsation standard
      if (input.username && input.alias) {
        tableConnectes = tableConnectes.filter(u => u.username !== input.username);
        tableConnectes.push({
          username: input.username,
          alias: input.alias,
          port: input.port || 9878,
          timestamp: Date.now()
        });
      }

      // Renvoi simultané de la liste mise à jour à l'utilisateur
      res.writeHead(200);
      res.end(JSON.stringify(tableConnectes));

    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Paquet mal forme.' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Fichier central RP2P actif sur le port ${PORT}`);
});
