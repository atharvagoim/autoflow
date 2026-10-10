import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useToast } from "./toast";
import { errorMessage } from "./api";

export function useDemoLogin() {
  const { demo, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  async function start() {
    if (user) return navigate("/app");
    setLoading(true);
    try {
      await demo();
      navigate("/app");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }
  return { start, loading };
}
