// useLibs
// noPage

import { esp } from "esoftplay"
import { LibUtils } from "esoftplay/cache/lib/utils/import"
import { UserClass } from "esoftplay/cache/user/class/import"
import { serverTimestamp } from "firebase/firestore"
import { Alert } from "react-native"
import Firestore, { DataId } from "../chatting/firestore"


export interface ChattingLibReturn {
  chatSendNew: (chat_to: string, message: string, attach: any, withHistory?: boolean, callback?: (message: any, chat_id: string) => void) => void,
  chatSend: (chat_id: string, chat_to: string, message: string, attach: any, callback: (message: any) => void) => void,
  chatAll: (chat_id: string, callback: (messages: any[]) => void, lastIndex?: string) => void,
  chatGet: (chat_id: string, key: string, callback: (chat: any) => void) => void,
  chatDelete: (chat_id: string, key: string) => void,
  chatGetAll: (chat_id: string, callback: (allmsg: any, end?: boolean) => void, page?: number, limit?: number) => void,
  chatListenChange: (chat_id: string, callback: (removedChild: any) => void) => void,
  chatUpdate: (key: string, chat_id: string, value: any) => void,
  listenUser: (user_id: string, callback: (user: any) => void) => void,
  setUser: (username?: string, image?: string, deleted?: boolean) => void,
  getChatId: (chat_to: string, group_id: string, callback: (chat_id: string) => void) => void,
  pathChat: any,
  pathHistory: any,
  pathUsers: any,
}

export default function m(): ChattingLibReturn {
  const group_id = esp.config('group_id') || '4'
  const perPage = 20

  // const rootPath: string = esp?.appjson?.()?.expo?.name
  const rootPath: string = "bbo"
  const pathChat = [rootPath, 'chat', 'chat']
  const pathHistory = [rootPath, 'chat', 'history']
  const pathUsers = [rootPath, 'chat', 'users']


  function chatSendNew(chat_to: string, message: string, attach: any, withHistory?: boolean, callback?: (message: any, chat_id: string) => void): void {
    const user = UserClass?.state?.()?.get?.()

    if (!user) return
    if (user?.id == chat_to) {
      Alert.alert('Oops..!', 'Mohon Maaf, anda tidak dapat mengirim pesan dengan akun anda sendiri')
      return
    }
    const chat_id = (new Date().getTime() / 1000).toFixed(0)
    let msg: any = {
      msg: message,
      read: '0',
      time: chat_id,
      timestamp: serverTimestamp(),
      user_id: user?.id,
    }
    if (attach) {
      msg['attach'] = attach
    }
    /* buat chat member default */
    let member = {
      is_typing: false,
      draf: ''
    }

    Firestore.add.collection([...pathChat, chat_id, 'conversation'], msg, () => { })
    /* me */
    Firestore.add.doc([...pathChat, chat_id, 'member', user?.id], member, () => { })
    /* notMe */
    Firestore.add.doc([...pathChat, chat_id, 'member', chat_to], member, () => { })

    if (callback) callback(msg, chat_id)
    if (withHistory) historyNew(chat_id, chat_to, message)
  }
  function historyNew(chat_id: string, chat_to: string, last_message: string): void {
    const user = UserClass?.state?.()?.get?.()

    if (!user) return
    const _time = (new Date().getTime() / 1000).toFixed(0)
    let me = {
      chat_id: chat_id,
      time: _time,
      chat_to: chat_to,
      last_message,
      read: "0",
      sender_id: user.id
    }
    let notMe = {
      chat_id: chat_id,
      time: _time,
      chat_to: user?.id,
      last_message,
      read: "0",
      sender_id: user.id
    }
    Firestore.add.collection([...pathHistory, user?.id, group_id], me, () => { })
    Firestore.add.collection([...pathHistory, chat_to, group_id], notMe, () => { })
  }
  function chatSend(chat_id: string, chat_to: string, message: string, attach: any, callback: (message: any) => void): void {

    const user = UserClass?.state?.()?.get?.()

    if (!user) return
    const _time = (new Date().getTime() / 1000).toFixed(0)
    let msg: any = {
      msg: message,
      read: '0',
      time: _time,
      timestamp: serverTimestamp(),
      user_id: user?.id,
    }
    if (attach) {
      msg['attach'] = attach
    }
    /* buat chat member default */
    let member = {
      is_typing: false,
      draf: ''
    }
    /* simpan pesan */
    Firestore.add.collection([...pathChat, chat_id, 'conversation'], msg, (dt) => {
      msg['key'] = dt?.id
      if (callback) {
        callback(msg)
      }
    })

    /* set members */
    Firestore.add.doc([...pathChat, chat_id, 'member', user?.id], member, () => { })
    Firestore.add.doc([...pathChat, chat_id, 'member', chat_to], member, () => { })

    Firestore.get.collectionWhere([...pathHistory, user?.id, group_id], [['chat_id', '==', chat_id]], (data) => {

      const currentHistory = data[0]
      const currentKeyHistory = currentHistory.id

      Firestore.update.doc([...pathHistory, user.id, group_id, currentKeyHistory], [
        { key: "time", value: _time },
        { key: "last_message", value: message },
        { key: "read", value: "0" },
        { key: "sender_id", value: user?.id },
      ], () => { })

      Firestore.get.collection([...pathHistory, chat_to, group_id], (dt) => {
        if (dt) {
          for (let key in dt) {
            if (dt[key].data.chat_id == chat_id) {
              Firestore.update.doc([...pathHistory, chat_to, group_id, dt[key].id], [
                { key: "time", value: _time },
                { key: "last_message", value: message },
                { key: "read", value: "0" },
                { key: "sender_id", value: user?.id },
              ], () => { })
              break;
            }
          }
        }
      })
    })
  }
  function chatAll(chat_id: string, callback: (messages: any[]) => void, lastIndex?: string): void {
    const user = UserClass?.state?.()?.get?.()

    if (!user) return
    Firestore.get.collectionWhereOrderBy([...pathChat, chat_id, 'conversation'], [], [], (arr) => {
      if (arr) {
        const snapshoot: any = arr;
        let a: any = {}
        snapshoot.map((key: any) => {
          let item = snapshoot[key];
          item.key = key
          a[key] = item
        })
        callback(a);
      } else {
        //@ts-ignore
        callback(null)
      }
    })
  }
  function chatGet(chat_id: string, key: string, callback: (chat: any) => void): void {
    const user = UserClass?.state?.()?.get?.()

    if (user) return
    Firestore.get.doc([...pathChat, chat_id, 'conversation', key], [], (dt: DataId) => {
      if (dt) {
        callback({ ...dt, key: dt.id });
      } else {
        callback(null)
      }
    })
  }
  function chatDelete(chat_id: string, key: string): void {
    const user = UserClass?.state?.()?.get?.()

    if (!user) return
    Firestore.delete.doc([...pathChat, chat_id, 'conversation', key], () => { })
  }
  function chatGetAll(chat_id: string, callback: (allmsg: any, end?: boolean) => void, isStartPage?: number, limit?: number): void {
    const user = UserClass?.state?.()?.get?.()
    if (!user) return
    Firestore.paginate(isStartPage == 1 ? true : false, [...pathChat, chat_id, 'conversation'], [], [["timestamp", "desc"]], limit || perPage, (dt, endR) => {
      if (dt) {
        callback(dt, endR);
      } else {
        callback(null)
      }
    })
  }
  function chatListenChange(chat_id: string, callback: (removedChild: any) => void) {
    const user = UserClass?.state?.()?.get?.()

    if (!user) return
    Firestore.listen.collection([...pathChat, chat_id, 'conversation'], [], [["timestamp", "desc"]], (dt) => {
      callback(dt);
    })
  }
  function chatUpdate(key: string, chat_id: string, value: any): void {
    const user = UserClass?.state?.()?.get?.()
    if (!key) return
    if (!user) return
    Firestore.add.doc([...pathChat, chat_id, 'conversation', key], value, () => { })
  }
  function listenUser(user_id: string, callback: (user: any) => void) {
    const user = UserClass?.state?.()?.get?.()

    if (!user) return
    Firestore.listen.doc([...pathUsers, user_id], (dt) => {
      if (dt) {
        callback(dt)
      } else {
        callback(null)
      }
    })
  }
  function setUser(username?: string, image?: string, deleted?: boolean): void {
    const user = UserClass?.state?.()?.get?.()

    if (!user) return
    Firestore.add.doc([...pathUsers, user.id], {
      username: LibUtils.ucwords(username || user.name),
      image: image || user.image,
      deleted: deleted ? '1' : '0'
    }, () => { })
  }
  function getChatId(chat_to: string, group_id: string, callback: (chat_id: string) => void): void {
    const user = UserClass?.state?.()?.get?.()

    if (!user) return
    let chattochecks: string[] = [];
    const check = (id: string, opposite_id: string, callback: (chat_id: string) => void) => {
      chattochecks.push(id + '+' + opposite_id)
      Firestore.get.collection([...pathHistory, id, group_id || group_id], (dt) => {

        if (dt) {
          let s: any[] = dt.filter((s: any) => s.data.chat_to == opposite_id)

          if (s.length > 0) {
            callback(s[0]?.data?.chat_id)
          } else {
            callback("")
          }
        } else {
          callback("")
        }
      })
    }
    /* check my node */
    check(user?.id, chat_to, chat_id => {
      if (chat_id) {
        callback(chat_id)
      } else {
        /* check opposite node */
        check(chat_to, user?.id, chat_id => {
          callback(chat_id)
        })
      }
    })
  }


  return {
    pathChat: pathChat,
    pathUsers: pathUsers,
    pathHistory: pathHistory,
    chatSendNew: chatSendNew,
    chatSend: chatSend,
    chatAll: chatAll,
    chatGet: chatGet,
    chatDelete: chatDelete,
    chatGetAll: chatGetAll,
    chatListenChange: chatListenChange,
    chatUpdate: chatUpdate,
    listenUser: listenUser,
    setUser: setUser,
    getChatId: getChatId,
  }

}