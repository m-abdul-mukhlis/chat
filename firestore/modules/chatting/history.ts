// useLibs
// noPage
import { esp, useGlobalReturn } from 'esoftplay';
import { ChattingLib } from 'esoftplay/cache/chatting/lib/import';
import { UserClass } from 'esoftplay/cache/user/class/import';
import useGlobalState from 'esoftplay/global';

import { useEffect } from 'react';
import Firestore from './firestore';
export interface ChatHistoryReturn {
  data: any[],
  update: () => void,
  deleteCache: () => void,
  unread: number
}

const cattingHistory: any = useGlobalState<any[]>([], { persistKey: 'chat_history', isUserData: true });
export function state(): useGlobalReturn<any[]> {
  return cattingHistory
}
export default function m(): ChatHistoryReturn {
  const [data, setData, delData] = state().useState()
  const user = UserClass.state().useSelector((s: any) => s)
  const group_id = esp.config("group_id")

  useEffect(() => {
    let unsubsribe: any
    let cleaner: any
    cleaner = _get()
    unsubsribe = setInterval(() => {
      cleaner = _get()
    }, 60000)
    return () => {
      cleaner && cleaner()
      unsubsribe && clearInterval(unsubsribe)
    }
  }, [])

  function update(hist: any) {
    let histories: any[] = []
    let count = 0

    const setvalue = () => {
      count++
      if (hist.length == count) {
        function compare(a: any, b: any) {
          if (a.time < b.time) return 1
          if (a.time > b.time) return -1
          return 0;
        }
        setData(histories.sort(compare))
      }
    }

    if (hist.length > 0)
      hist.forEach((item: any) => {
        const path = ChattingLib().pathUsers
        const _snapshoot = item.data
        item['user_id'] = _snapshoot.sender_id
        item['chat_to'] = _snapshoot.chat_to
        item['msg'] = _snapshoot.last_message
        item['time'] = _snapshoot.time
        item['read'] = user.id == _snapshoot.sender_id ? 1 : _snapshoot.read

        Firestore.get.doc([...path, _snapshoot.chat_to], [], (snap) => {
          if (snap) {
            histories.push({ ...item, ...item.data, ...snap.data, id: snap.id })
            setvalue()
          } else {
            setvalue()
          }
        })

      })
  }

  function _get() {
    if (!user || !user.hasOwnProperty("id")) return
    const pathHistory = ChattingLib().pathHistory

    Firestore.listen.collection([...pathHistory, user.id, group_id], [], [["time", "desc"]], (snapshoot) => {
      update(snapshoot)
    })
  }

  return {
    data: data,
    update: _get,
    deleteCache: delData,
    unread: data?.filter?.((x => x?.data?.read == 0)).length
  }
}