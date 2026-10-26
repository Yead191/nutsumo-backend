const axios = require("axios");

const KONG_PROXY = process.env.KONG_PROXY || "http://kong:8000";
const CHECK_PATHS = ["/","/files/4343",]; // try a few paths

async function ping() {
  for (const p of CHECK_PATHS) {
    try {
      await axios.get(`${KONG_PROXY}${p}`, { timeout: 3000 });
      console.log("Kong warm ping success:", p);
      return;
    } catch (err) {
    
    }
  }
  console.log("Kong keepalive: ping failed (but continuing).");
}

setInterval(() => {
  ping();
}, 3000);

// immediate first run
ping();
