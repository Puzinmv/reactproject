import { createDirectus, authentication, graphql, rest } from "@directus/sdk";

export const directus = createDirectus('http://localhost:8055')
    .with(authentication('cookie', { credentials: 'include' }))
//    .with(graphql({ credentials: 'include' }))
//    .with(rest({ credentials: 'include' }))
    ;
