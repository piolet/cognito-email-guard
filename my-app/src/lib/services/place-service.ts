// import { type Place, Roles, type User } from 'types'
import { error } from '@sveltejs/kit'
import { BaseService, type PartialRequestEvent } from './base-service'
// import { AuthService } from '../auth/auth-service'

export class PlaceService extends BaseService<any> {
	public createNewItem(): any {
		return {
			name: '',
			slug: '',
			description: '',
			types: [],
			zipcode: '',
			city: '',
			isOnline: false,
			isApproved: false
		}
	}

	public async delete(id: string, event: PartialRequestEvent): Promise<Response> {
		return await this.deleteItem('places', id, event)
	}

	public async update(place: any, event: PartialRequestEvent): Promise<any> {
		return await this.updateItem('places', place, event)
	}

	public async patch(
		place: Partial<any>,
		{ fetch, locals }: PartialRequestEvent
	): Promise<any> {
		return await this.patchItem('places', place, { fetch, locals })
	}

	// public async create(place: Omit<any, 'id'>, event: PartialRequestEvent): Promise<any> {
	// 	return await this.createItem('places', place, event)
	// }

	public async searchAll(
		query: string,
		event: PartialRequestEvent
	): Promise<{ places: any[]; total: number }> {
		const params: URLSearchParams = new URLSearchParams({
			name: query,
			page: '1',
			itemsPerPage: '15'
		})
		const data = await this.fetchAllPublicItems(`places?${params.toString()}`, event)

		return {
			places: data.items,
			total: data.total
		}
	}

	public async fetchLastPlaces(
		event: PartialRequestEvent
	): Promise<{ places: any[]; total: number }> {
		const data = await this.fetchAllPublicItems('places/last', event)

		return {
			places: data.items,
			total: data.total
		}
	}

	public async fetchPlacesByType(
		typeName: string,
		event: PartialRequestEvent,
		latitude?: number,
		longitude?: number
	): Promise<{ places: any[]; total: number }> {
		const params: URLSearchParams = new URLSearchParams({})
		if (latitude && longitude) {
			params.append('latitude', latitude.toString())
			params.append('longitude', longitude.toString())
		}
		const data = await this.fetchAllPublicItems(
			`types/${typeName}/places?${params.toString()}`,
			event
		)

		return {
			places: data.items,
			total: data.total
		}
	}

	public async fetchAll(
		event: PartialRequestEvent,
		page: number = 1,
		itemsPerPage: number = 10
	): Promise<{ places: any[]; total: number }> {
		const params: URLSearchParams = new URLSearchParams({
			// pagination: 'true',
			// page: page.toString(),
			// itemsPerPage: itemsPerPage.toString(),
			// 'order[approvedAt]': 'desc'
		})
		const data = await this.fetchAllPublicItems(`places?${params.toString()}`, event)

		return {
			places: data.items,
			total: data.total
		}
	}

	public async fetchAllByUser(
		userId: number | string | undefined,
		event: PartialRequestEvent
	): Promise<{ places: any[]; total: number }> {
		const data = await this.fetchAllItems(`users/${userId}/places`, event)

		return {
			places: data.items,
			total: data.total
		}
	}

	public async fetchAllByZipcode(
		zipcode: number | string | undefined,
		event: PartialRequestEvent
	): Promise<{ places: any[]; total: number }> {
		const data = await this.fetchAllPublicItems(`cities/${zipcode}/places`, event)

		return {
			places: data.items,
			total: data.total
		}
	}

	// public async fetchPlacesByNumber(
	// 	number: string,
	// 	slug: string,
	// 	event: PartialRequestEvent
	// ): Promise<{ places: any[]; total: number }> {
	// 	number = number.toLowerCase()
	// 	number = number === '2a' || number === '2b' ? '20' : number
	// 	const data = await this.fetchAllPublicItems(`departments/${number}/${slug}/places`, event)
	//
	// 	return {
	// 		places: data.items,
	// 		total: data.total
	// 	}
	// }

	public async fetchPlace(
		id: number | string | undefined,
		event: PartialRequestEvent
	): Promise<any> {
		return await this.fetchItem('places', id, event)
	}

	public async fetchPlaceById(
		id: string | number | undefined,
		event: PartialRequestEvent
	): Promise<any> {
		const message = 'Place not found'
		if (!id) error(404, message)

		return await this.fetchPublicItem(`places/id/${id}`, event, message)
	}

	public async fetchPlaceBySlug(
		slug: string | undefined,
		event: PartialRequestEvent
	): Promise<any> {
		const message = 'Place not found'
		if (!slug) error(404, message)

		return await this.fetchPublicItem(`places/slug/${slug}`, event, message)
	}

	public async fetchPlaceForPreview(
		id: string | number | undefined,
		event: PartialRequestEvent
	): Promise<any> {
		const message = 'Place not found'
		if (!id) error(404, message)

		return await this.fetchItem('places', `${id}/preview`, event, false, message)
	}

	public async search(
		latitude: number,
		longitude: number,
		event: PartialRequestEvent,
		ray: number = 15
	): Promise<{ places: any[]; total: number }> {
		let path = `search/places/latitude/${latitude}/longitude/${longitude}/ray/${ray}`
		const data = await this.fetchAllPublicItems(path, event)
		return {
			places: data.items,
			total: data.total
		}
	}

	public async addPlace(event: PartialRequestEvent, userId: string = ''): Promise<any> {
		const body = userId ? { owner: `/users/${userId}` } : {}
		return await this.addItem('places', event, body)
	}

	// public canDisplayForUser(place: any, user: User): boolean {
	// 	const owner = parseInt((place.owner || '0').replace(/\D/g, ''))
	// 	return (
	// 		(place.isOnline && place.isApproved) ||
	// 		owner === user.id ||
	// 		AuthService.isAllowed(user, [Roles.ROLE_ADMIN])
	// 	)
	// }
}
