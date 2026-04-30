const FIOS_URL = "https://fios-api.kloudip.com/api";
const token = "b507db56e768bd62af1e9b6e184a0f7987B5D187A5190B92E4F4F80B08D43CD23D20EA6A";

async function test() {
  const loginParams = encodeURIComponent(JSON.stringify({ token: token, fl: 1 }));
  const loginRes = await fetch(`${FIOS_URL}?svc=token/login&params=${loginParams}`);
  const loginData = await loginRes.json();
  const sid = loginData.eid;

  const searchParams = encodeURIComponent(JSON.stringify({
    spec: { itemsType: "avl_unit", propName: "", propValueMask: "*", sortType: "" },
    force: 1, flags: 4194305, from: 0, to: 0
  }));
  const res = await fetch(`${FIOS_URL}?svc=core/search_items&params=${searchParams}&sid=${sid}`);
  const data = await res.json();
  console.log("items:", data.items ? data.items.length : 0);
}
test();
