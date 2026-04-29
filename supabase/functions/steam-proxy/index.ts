// steam-proxy — Supabase Edge Function
// Proxy para Steam Web API (resuelve CORS)
//
// Deploy: supabase functions deploy steam-proxy
// Secret:  supabase secrets set STEAM_API_KEY=xxx
//
// Usage:
//   GET /functions/v1/steam-proxy?steam_id=76561198XXXXXXXXX
//   GET /functions/v1/steam-proxy?vanity=MozzVader

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const STEAM_API_KEY = Deno.env.get("STEAM_API_KEY") ?? "";
const STEAM_BASE = "https://api.steampowered.com/ISteamUser";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function steamFetch(path: string) {
  const url = `${STEAM_BASE}${path}&key=${STEAM_API_KEY}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  return res.json();
}

/** Resuelve vanity URL a steam64 ID */
async function resolveVanity(vanity: string): Promise<string> {
  const data = await steamFetch(
    `/ResolveVanityURL/v0001/?vanityurl=${encodeURIComponent(vanity)}`
  );
  const id = data?.response?.steamid;
  if (!id) throw new Error("No se pudo resolver la vanity URL");
  return id;
}

/** Obtiene perfil del usuario */
async function getPlayerSummary(steamId: string) {
  const data = await steamFetch(
    `/GetPlayerSummaries/v0002/?steamids=${steamId}`
  );
  const players = data?.response?.players ?? [];
  const p = players[0];
  if (!p) throw new Error("Perfil no encontrado");
  return {
    steamId: p.steamid,
    personaName: p.personaname,
    avatar: p.avatarfull,
    profileUrl: p.profileurl ?? "",
    onlineState: p.personastate,
    gameName: p.gameextrainfo ?? null,
  };
}

/** Últimos juegos jugados (2 semanas) — tolera perfil privado (401/403) */
async function getRecentGames(steamId: string) {
  try {
    const data = await steamFetch(
      `/GetRecentlyPlayedGames/v0001/?steamid=${steamId}&format=json`
    );
    const games = (data?.response?.games ?? []).slice(0, 5).map(
      (g: Record<string, unknown>) => ({
        name: g.name,
        appId: g.appid,
        playtime2weeks: Math.round((g.playtime_2weeks as number) / 60),
        playtimeForever: Math.round((g.playtime_forever as number) / 60),
        imgIconUrl: g.img_icon_url
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
          : null,
      })
    );
    return { games, totalCount: data?.response?.total_count ?? 0 };
  } catch {
    return { games: [], totalCount: 0 };
  }
}

/** Juegos owned + stats totales — tolera perfil privado (401/403) */
async function getOwnedGames(steamId: string) {
  try {
    const data = await steamFetch(
      `/GetOwnedGames/v0001/?steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`
    );
    const games = data?.response?.games ?? [];
    const totalGames = games.length;
    const totalHours = Math.round(
      games.reduce(
        (acc: number, g: Record<string, unknown>) =>
          acc + ((g.playtime_forever as number) ?? 0),
        0
      ) / 60
    );
    return { totalGames, totalHours };
  } catch {
    return { totalGames: 0, totalHours: 0 };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!STEAM_API_KEY) {
    return json({ error: "Steam API key not configured" }, 500);
  }

  try {
    const url = new URL(req.url);
    let steamId = url.searchParams.get("steam_id");
    const vanity = url.searchParams.get("vanity");

    if (!steamId && vanity) {
      steamId = await resolveVanity(vanity);
    }

    if (!steamId) {
      return json({ error: "Se requiere steam_id o vanity" }, 400);
    }

    const [profile, recent, owned] = await Promise.all([
      getPlayerSummary(steamId),
      getRecentGames(steamId),
      getOwnedGames(steamId),
    ]);

    return json({
      profile,
      recentGames: recent.games,
      totalGames: owned.totalGames,
      totalHours: owned.totalHours,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
