<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project architecture

- Keep the hackathon MVP public and session-free; anonymous database access is limited to creating and reading evaluation rows so the live demo has no sign-in friction.
- Keep rubric scoring deterministic in `src/lib/evaluation.ts`; judge-facing results must remain reproducible and work without an external AI service.
- Use a public TanStack server function for evaluation persistence; the browser never receives privileged database credentials.
