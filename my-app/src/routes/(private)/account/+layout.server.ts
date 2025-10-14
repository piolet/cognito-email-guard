import type { ServerLoadEvent } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'
import { PlaceService} from "$lib/services/place-service";

const placeService = new PlaceService('http://api.heustach.loc/', 'ma-clef')
export const load = async (event: ServerLoadEvent) => {
	const { locals } = event


    const places = await placeService.fetchAllByUser(29, {fetch: event.fetch, locals})

	// if (!locals.user) {
	// 	redirect(302, '/login')
	// }

	return {
        places: [],
		// token: locals.user.token
	}
}
