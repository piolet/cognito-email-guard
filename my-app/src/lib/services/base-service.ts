// import { rtrim } from 'functions'
// import type { Violation } from 'types'
import { error, fail, type RequestEvent } from '@sveltejs/kit'

export type PartialRequestEvent = Pick<RequestEvent, 'fetch' | 'locals'>

export function rtrim(str: string, character: string = '\\s'): string {
    return str.replace(new RegExp(`${character}+$`), '')
}

export abstract class BaseService<T extends { id?: number | string }> {
	protected readonly apiUrl: string
	protected readonly headers: Headers

	public constructor(apiUrl: string, apiKey: string = '') {
		this.apiUrl = `${rtrim(apiUrl, '/')}/`
		this.headers = new Headers({
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		})
	}
	public async deleteItem(
		path: string,
		id: string,
		{ fetch, locals }: PartialRequestEvent
	): Promise<Response> {
		return await fetch(`${this.apiUrl}${path}/${id}`, {
			method: 'DELETE',
			headers: this.getHeaders(locals)
		})
	}

	public async patchItem(
		path: string,
		item: Partial<T>,
		{ fetch, locals }: PartialRequestEvent,
		allowUnauthenticated = false,
		forceUnauthenticated = false
	): Promise<T> {
		const response = await fetch(`${this.apiUrl}${path}/${item.id}`, {
			method: 'PATCH',
			headers: this.getHeaders(locals, true, allowUnauthenticated, forceUnauthenticated),
			body: JSON.stringify(this.formatItem(item))
		})

		return this.manageResponse(response)
	}

	public async updateItem(
		path: string,
		item: T,
		{ fetch, locals }: PartialRequestEvent,
		allowUnauthenticated = false
	): Promise<T> {
		const response = await fetch(`${this.apiUrl}${path}/${item.id}`, {
			method: 'PUT',
			headers: this.getHeaders(locals, false, allowUnauthenticated),
			body: JSON.stringify(this.formatItem(item))
		})

		return this.manageResponse(response)
	}

	public async createItem(
		path: string,
		item: Omit<T, 'id'>,
		{ fetch, locals }: PartialRequestEvent,
		allowUnauthenticated = false,
		forceUnauthenticated = false
	): Promise<T> {
		const response = await fetch(`${this.apiUrl}${path}`, {
			method: 'POST',
			headers: this.getHeaders(locals, false, allowUnauthenticated, forceUnauthenticated),
			body: JSON.stringify(item)
		})

		return this.manageResponse(response)
	}

	public async fetchAllItems(
		path: string,
		{ fetch, locals }: PartialRequestEvent,
		allowUnauthenticated = false,
		forceUnauthenticated = false
	): Promise<{ items: T[]; total: number; hasNext: boolean; hasPrevious: boolean }> {
		const response = await fetch(`${this.apiUrl}${path}`, {
			headers: this.getHeaders(locals, false, allowUnauthenticated, forceUnauthenticated)
		})
		const data = await response.json()
		if (!response?.ok) {
			error(response.status, `${data['hydra:title']}: ${data['hydra:description']}`)
		}

		return {
			items: data['hydra:member'] || [],
			total: data['hydra:totalItems'] || 0,
			hasNext: !!data['hydra:view']?.['hydra:next'] || false,
			hasPrevious: !!data['hydra:view']?.['hydra:previous'] || false
		}
	}

	public async fetchAllPublicItems(
		path: string,
		event: PartialRequestEvent
	): Promise<{ items: T[]; total: number; hasNext: boolean; hasPrevious: boolean }> {
		return this.fetchAllItems(path, event, true, true)
	}

	public async fetchItem(
		path: string,
		id: number | string | undefined,
		{ fetch, locals }: PartialRequestEvent,
		allowUnauthenticated = false,
		message: string = 'Not found'
	): Promise<T> {
		if (!id) return Promise.resolve(this.createNewItem())

		const response = await fetch(rtrim(`${this.apiUrl}${path}/${id}`.trim(), '/'), {
			headers: this.getHeaders(locals, false, allowUnauthenticated)
		})
		if (!response?.ok) error(404, message)

		return await response.json()
	}

	public async fetchPublicItem(
		path: string,
		{ fetch }: PartialRequestEvent,
		message: string = 'Not found'
	): Promise<T> {
		const response = await fetch(`${this.apiUrl}${path}`, {
			headers: this.headers
		})
		if (!response?.ok) error(404, message)

		return await response.json()
	}

	public async addItem(
		path: string,
		{ fetch, locals }: PartialRequestEvent,
		body: any = {}
	): Promise<T> {
		const response = await fetch(`${this.apiUrl}${path}`, {
			method: 'POST',
			headers: this.getHeaders(locals),
			body: JSON.stringify(body)
		})

		const jsonResponse = await response.json()
		if (!response?.ok) {
			if (jsonResponse.violations) {
				// const violations: Violation[] = jsonResponse.violations as Violation[]
				error(response.status, JSON.stringify(jsonResponse.violations))
			}
			error(response.status, `${jsonResponse['hydra:title']}: ${jsonResponse['hydra:description']}`)
		}

		return jsonResponse
	}

	// public getViolations(violations: Violation[]): Record<string, string> {
	// 	const apiErrors: Record<string, string> = {}
	// 	violations.forEach((violation) => {
	// 		apiErrors[violation.propertyPath] = violation.message
	// 	})
    //
	// 	return apiErrors
	// }

	private async manageResponse(response: Response): Promise<T> {
		const jsonResponse = await response.json()

		if (response?.ok) return jsonResponse

		if (jsonResponse.violations) {
			const violations: Record<string, string> = {}
            // this.getViolations(
			// 	jsonResponse.violations || ([] as Violation[])
			// )
			throw fail(response.status, { violations })
		}

		error(response.status, `${jsonResponse['hydra:title']}: ${jsonResponse['hydra:description']}`)
	}

	protected getHeaders(
		locals: any,
		merge: boolean = false,
		allowUnauthenticated: boolean = false,
		forceUnauthenticated: boolean = false
	): Headers {
		const headers: { 'Content-Type': string; Authorization?: string } = {
			'Content-Type': merge ? 'application/merge-patch+json' : 'application/json'
		}
		const token = locals.user?.token || ''
        console.log('base service getHeaders', {locals, token})
		if (!forceUnauthenticated && token) {
			headers['Authorization'] = `Bearer ${token}`
		} else if (allowUnauthenticated) {
			headers['Authorization'] = this.headers.get('Authorization') || ''
		} else {
			error(401, 'Not logged in')
		}

		return new Headers(headers)
	}

	public abstract createNewItem(): T

	private formatItem(item: Partial<T>): Partial<T> {
		return { ...item, id: `${item.id}` }
	}
}
