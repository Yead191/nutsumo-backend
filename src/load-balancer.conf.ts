import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";

const ROOT = process.cwd();
const MODULES_DIR = path.join(ROOT, "src", "app", "modules");
const DOCKER_COMPOSE_APP = path.join(ROOT, "docker-compose.app.yaml");
const KONG_YAML = path.join(ROOT, "kong.yaml");

// config for port allocation
const BASE_PORT = 5001; // starting port for modules
const MAX_PORT = 5999;

function loadYaml(filePath: string): any {
  if (!fs.existsSync(filePath)) return null;
  const txt = fs.readFileSync(filePath, "utf8");
  return yaml.load(txt);
}

function saveYaml(filePath: string, obj: any) {
  const txt = yaml.dump(obj, { noRefs: true, sortKeys: false });
  fs.writeFileSync(filePath, txt, "utf8");
}

function listModuleNames(): string[] {
  if (!fs.existsSync(MODULES_DIR)) return [];
  return fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(Boolean);
}

function findUsedPorts(compose: any): Set<number> {
  const used = new Set<number>();
  if (!compose?.services) return used;
  Object.values(compose.services).forEach((svc: any) => {
    if (!svc.ports) return;
    svc.ports.forEach((p: string) => {
      // p formats: "5001:5001" or "10.10.7.9:5001:5001"
      const parts = p.split(":");
      const hostPort = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(hostPort)) used.add(hostPort);
    });
  });
  return used;
}

function findServiceInKong(kong: any, name: string) {
  if (!kong?.services) return null;
  return kong.services.find((s: any) => s.name === name);
}

function findServiceInCompose(compose: any, name: string) {
  if (!compose?.services) return null;
  return compose.services[name];
}

function nextAvailablePort(used: Set<number>): number {
  for (let p = BASE_PORT; p <= MAX_PORT; p++) {
    if (!used.has(p)) return p;
  }
  throw new Error("No available ports");
}

async function run() {
  const modules = listModuleNames().map(m=>m.toLowerCase());
  console.log("Found modules:", modules);

  // load compose (or create base skeleton)
  let compose = loadYaml(DOCKER_COMPOSE_APP);
  if (!compose) {
    compose = {
      version: "3.9",
      services: {},
      networks: { "template-network": { external: true } },
    };
  } else {
    // ensure skeleton keys exist
    compose.services = compose.services || {};
    compose.networks = compose.networks || { "template-network": { external: true } };
  }

  // load kong
  let kong = loadYaml(KONG_YAML);
  if (!kong) {
    kong = { _format_version: "3.0", services: [] };
  } else {
    kong.services = kong.services || [];
  }

  // compute used ports (keep them)
  const usedPorts = findUsedPorts(compose);

  // keep a map of module->port from existing services to preserve assigned ports
  const modulePorts = new Map<string, number>();
  Object.entries(compose.services).forEach(([svcName, svcDef]: any) => {
    // expected svcName format: <module>-service
    if (typeof svcName === "string" && svcName.endsWith("-service")) {
      const moduleName = svcName.replace(/-service$/, "");
      if (svcDef.ports && svcDef.ports.length > 0) {
        const pStr = svcDef.ports[0];
        const parts = pStr.split(":");
        const hostPort = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(hostPort)) {
          modulePorts.set(moduleName, hostPort);
        }
      }
    }
  });

  // ensure deterministic port allocation for new modules
  const excludeMods = ['resettoken']
  modules.forEach(mod => {
    if(excludeMods.includes(mod)) return
    const svcName = `${mod}-service`;
    if (!findServiceInCompose(compose, svcName)) {
      // assign port: reuse if exists in modulePorts else find next available
      let port = 5100+Math.floor(Math.random() * 1000);
      if (!port) {
        port = nextAvailablePort(usedPorts);
      }
      usedPorts.add(port);

      // create service
      compose.services[svcName] = {
        build: ".",
        ports: [`${port}:${port}`],
        environment: [
          `PORT=${port}`,
          'DATABASE_URL=${MONGO_URL}',
          `BACKUP_DATABASE_URL=mongodb://mongo:27017/embay`,
          `REDIS_HOST=redis`,
          `REDIS_PORT=6379`,
          `KAFKA_URL=kafka:9092`,
          `ELASTICSEARCH_URL=http://elasticsearch:9200`,
          `IP_ADDRESS=0.0.0.0`,
        ],
        networks: ["template-network"],
      };
      console.log(`Added ${svcName} -> port ${port}`);
    } else {
      console.log(`${svcName} already exists — preserved`);
    }

    // kong entry
    if (!findServiceInKong(kong, `${mod}-service`)) {
      // determine port for kong url (from compose)
      const svc = compose.services[`${mod}-service`];
      const pstr = svc.ports && svc.ports.length > 0 ? svc.ports[0] : `${BASE_PORT}:${BASE_PORT}`;
      const parts = pstr.split(":");
      const hostPort = parseInt(parts[parts.length - 1], 10);
      kong.services.push({
        name: `${mod}-service`,
        url: `http://${mod}-service:${hostPort}/api/v1/${mod}`,
        routes: [
          {
            name: `${mod}-route`,
            paths: [`/api/v1/${mod}`],
            protocols: ["http", "https"],
          },
        ],
      });
      console.log(`Added kong service for ${mod}-service`);
    } else {
      console.log(`kong service for ${mod}-service exists — preserved`);
    }
  });

  // Write back the files
  saveYaml(DOCKER_COMPOSE_APP, compose);
  saveYaml(KONG_YAML, kong);

  console.log("docker-compose.app.yml and kong.yaml updated.");
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
