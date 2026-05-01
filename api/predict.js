export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const token = req.query.token;
    if (token !== process.env.API_TOKEN) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { home_state, gender, category, is_pwd, crl_rank } = req.query;

    if (!home_state || !gender || !category || !is_pwd || !crl_rank) {
      return res.status(400).json({ error: "Missing required query params" });
    }

    const baseUrl = "https://api.ogcollege.io/api/v1/cutoffs/predict-college/6298363b-49bd-45f0-af9b-971545c00997";

    const params = new URLSearchParams({
      home_state,
      gender,
      category,
      is_pwd,
      crl_rank,
      page_no: "0",
      page_size: "10000",
      search: "",
      program_ids: "[]",
      institute_types: "[]",
    });

    const apiUrl = `${baseUrl}?${params.toString()}`;

    const apiRes = await fetch(apiUrl, {
      method: "GET",
      headers: {
        accept: "application/json"
      }
    });

    const text = await apiRes.text();
    return res.status(apiRes.status).send(text);
  } catch (err) {
    console.error("predict.js error:", err);
    return res.status(500).json({ error: err.message });
  }
}
