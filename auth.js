import { parse } from "url"
import { clientIdExists } from "./utils.js"

export async function authenticate (request) {
    const { token } = parse(request.url, true).query
    if (token && await clientIdExists(token)) {
        return token
    }
    return false
}
