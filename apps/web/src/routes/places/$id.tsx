import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/places/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$locale/places/$id", params: { locale: "fr", id: params.id } });
  },
});
