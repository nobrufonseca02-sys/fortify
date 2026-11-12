// Chaves de produto.
//
// METAAPI_ENABLED: conexão de conta por login e senha do MT5 (MetaApi) e o botão
// "Sincronizar agora". Desligada desde 12/11/2026: o Fortify Guard (EA) passou a
// ser a fonte de dados das contas. O código da MetaApi continua no projeto; para
// religar, defina VITE_METAAPI_ENABLED=true no ambiente.
export const METAAPI_ENABLED = import.meta.env.VITE_METAAPI_ENABLED === 'true';
