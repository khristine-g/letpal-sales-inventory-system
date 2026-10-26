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

## Project rules
- All data mutations go through pure functions in src/lib/business.ts, wrapped by the DataProvider in src/lib/store.tsx; swap these for API calls when a backend is added.
- Demo data lives in src/lib/mock-data.ts with a fixed demo "today" so SSR and client render identically.
- tsconfig keeps `strict` but drops noUncheckedIndexedAccess/exactOptionalPropertyTypes/noPropertyAccessFromIndexSignature to keep UI code readable.
