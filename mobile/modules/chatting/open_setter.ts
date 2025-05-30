// useLibs
// noPage
import { ChattingLib } from 'esoftplay/cache/chatting/lib/import';
import { UserClass } from 'esoftplay/cache/user/class/import';
import esp from 'esoftplay/esp';
import { useEffect } from 'react';
import { AppState } from 'react-native';

export default function m(chat_id: string): void {
  const user = UserClass.state().useSelector((s: any) => s)
  let time: any = undefined

  function _set() {
    if (chat_id && user) {
      const app: any = esp.mod("firestore/index")().init()
      const path = ChattingLib().pathChat
      const timestamp = (new Date().getTime() / 1000).toFixed(0)

      esp.mod("firestore/index")().getCollectionIds(app, [...path, chat_id, "member"], [["user_id", "==", user?.id]], [], (arr: any) => {
        if (arr.length > 0) {
          esp.mod("firestore/index")().updateDocument(app, [...path, chat_id, "member", arr?.[0]], [{ key: "is_open", value: timestamp }], () => { })
        }
      })
    }
  }

  function onAppStateChange(state: string) {
    if (state == "active") {
      if (time) clearInterval(time)
      setInterval(_set, 5000)
    } else {
      if (time) clearInterval(time)
    }
  }

  useEffect(() => {
    time = setInterval(_set, 5000)
    const subs: any = AppState.addEventListener("change", onAppStateChange)
    return () => {
      if (time) clearInterval(time)
      subs.remove()
    }
  }, [chat_id])
}