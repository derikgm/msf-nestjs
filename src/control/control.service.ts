import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class ControlService {

  constructor() {
    // do_server_ping(
    //   "control-server",
    //   "https://control-server-unpt.onrender.com"
    // );

    // setInterval(() => {
    //   do_server_ping(
    //     "control-server",
    //     "https://control-server-unpt.onrender.com"
    //   );
    // }, 300000)
  }

  ping(){
    return {ok: true}
  }

}

// async function do_server_ping(server: string, path: string) {
//   fetch(`${path}/ping`)
//   .then((res) => {
//     if(res.ok){
//       console.log(`Servidor ${server} estable`)
//     }
//   })
//   .catch((e) => {
//     console.log(`Error en servidor: ${server}, error: ${e}`)
//   })
// }
