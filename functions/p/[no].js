import { sharePage } from '../../server/og/page.mjs';
import data from '../../server/og/demo_data.json';
export const onRequestGet = ({ request, env, params }) => sharePage('p', params.no, request, env, data);
