import type { ServerLoadEvent } from '@sveltejs/kit'
import {PUBLIC_API_URL, PUBLIC_API_KEY} from '$env/static/public';
import { redirect } from '@sveltejs/kit'
import { PlaceService} from "$lib/services/place-service";

const placeService = new PlaceService(PUBLIC_API_URL, PUBLIC_API_KEY)
export const load = async (event: ServerLoadEvent) => {
	const { locals, cookies } = event
    let idToken = event.cookies.get('idToken');

    let places = []
    try {
        places = (await placeService.fetchAllByUser(29, {fetch: event.fetch, locals})).places
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
