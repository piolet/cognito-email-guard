import type { ServerLoadEvent } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'

export const load = async (event: ServerLoadEvent) => {
	const { locals } = event

	// if (!locals.user) {
	// 	redirect(302, '/login')
	// }

	return {
		// token: locals.user.token
	}
}
