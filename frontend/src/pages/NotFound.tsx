import { ButtonLink } from "../components/ui";
import { Asterisk } from "../components/Brand";

export default function NotFound({ inApp }: { inApp?: boolean }) {
  return (
    <div className={inApp ? "grid min-h-[60vh] place-items-center" : "grid min-h-dvh place-items-center px-6"}>
      <div className="text-center">
        <Asterisk className="mx-auto w-12" />
        <h1 className="mt-6 font-display text-4xl font-bold">This page doesn’t exist</h1>
        <p className="mt-2 text-mute">The link may be old or mistyped.</p>
        <ButtonLink to={inApp ? "/app" : "/"} className="mt-8">
          {inApp ? "Back to home" : "Go to the homepage"}
        </ButtonLink>
      </div>
    </div>
  );
}
