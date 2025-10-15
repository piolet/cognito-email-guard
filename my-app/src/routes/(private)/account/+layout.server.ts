import type { ServerLoadEvent } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'
import { PlaceService} from "$lib/services/place-service";

const placeService = new PlaceService('http://api.heustach.loc/', 'ma-clef')
export const load = async (event: ServerLoadEvent) => {
	const { locals, cookies } = event
    let idToken = event.cookies.get('idToken');

    let places = []
    try {
        places = (await placeService.fetchAllByUser(16, {fetch: event.fetch, locals})).places
    } catch (error) {
        console.error('Error fetching places:', error);
    }

	// if (!locals.user) {
	// 	redirect(302, '/login')
	// }

	return {
        places,
        user: locals.user,
        idToken,
		// token: locals.user.token
	}
}
