import { sharePage } from '../../server/og/page.mjs';
import data from '../../server/og/demo_data.json';
export const onRequestGet = ({ request, env, params }) => sharePage('g', params.code, request, env, data);
