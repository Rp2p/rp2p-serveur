const http = require('http');

const PORT = process.env.PORT || 3000;
const SECRET_TOKEN = 'RP2P_TOKEN_SECURE_2026';
const AGENT_SECRET_ATTENDU = 'RP2P-SOUVERAIN-PORTAL-2026';

let annuaireRelais = [];

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RP2P-Signature');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const agentRecu = req.headers['x-rp2p-signature'];
  if (req.method !== 'POST' || agentRecu !== AGENT_SECRET_ATTENDU) {
    res.writeHead(403);
    res.end(JSON.stringify({ error: 'Erreur Systeme : Terminal non identifie.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const input = JSON.parse(body);
      const userIp = req.socket.remoteAddress.replace(/^.*:/, '');

      if (!input.token || input.token !== SECRET_TOKEN) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Jeton reseau invalide.' }));
        return;
      }

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

      const tempsLimite = Date.now() - 60000;
      annuaireRelais = annuaireRelais.filter(node => node.derniere_puce > tempsLimite);

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
