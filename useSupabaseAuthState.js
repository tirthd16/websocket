import pkg, { BufferJSON, WAProto } from 'baileys';
const { proto,initAuthCreds } = pkg;
import { supabase } from './supabase.js';

export const useSupabaseAuthState = async (clientId) => {
  const table = 'bailey_auth';

  const makeId = (type, id) => `${clientId}_${type}-${id}`;

const writeData = async (type, id, value) => {
  await supabase
    .from(table)
    .upsert({
      id: makeId(type, id),
      type,
      data: JSON.parse(JSON.stringify(value, BufferJSON.replacer))
    });
};
const readData = async (type, id = '') => {
  const { data, error } = await supabase
    .from(table)
    .select('data')
    .eq('id', makeId(type, id))
    .single();

  if (error || !data) return null;

  const value = JSON.parse(JSON.stringify(data.data),BufferJSON.reviver)

  if (type === 'app-state-sync-key') {
    return proto.Message.AppStateSyncKeyData.fromObject(value);
  }

  return value;
};

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          await Promise.all(ids.map(async (id) => {
            const value = await readData(type, id);
            result[id] = value;
          }));
          return result;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              if (value) {
                tasks.push(writeData(category, id, value));
              } else {
                tasks.push(removeData(category, id));
              }
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await writeData('creds', '', creds);
    }
  };
};
