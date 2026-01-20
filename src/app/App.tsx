import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "./storage";
import type { AppState } from "./types";
import { Dashboard } from "../pages/Dashboard";
import { Loans } from "../pages/Loans";
import { Assets } from "../pages/Assets";
import { Liabilities } from "../pages/Liabilities";
import { Layout } from "../components/Layout";

type Route = "/" | "/loans" | "/assets" | "/liabilities";

function getRouteFromHash(): Route {
  const h = (window.location.hash || "#/").replace("#", "");
  if (h === "/loans" || h === "/assets" || h === "/liabilities") return h;
  return "/";
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [route, setRoute] = useState<Route>(() => getRouteFromHash());

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    const onHash = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const page = useMemo(() => {
    switch (route) {
      case "/loans":
        return <Loans state={state} setState={setState} />;
      case "/assets":
        return <Assets state={state} setState={setState} />;
      case "/liabilities":
        return <Liabilities state={state} setState={setState} />;
      case "/":
      default:
        return (
          <Layout title="Dashboard">
            <Dashboard state={state} setState={setState} />
          </Layout>
        );
    }
  }, [route, state]);

  return page;
}
