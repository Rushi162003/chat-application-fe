import styles from "./Chatbox.module.scss";
import RecivedProfile from "../RecivedProfile/RecivedProfile";
import { useSocket } from "@/hooks/useSocket";

const Chatbox = () => {

  const socket = useSocket();
  console.log("socket===============", socket);
  const profile = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "1234567890",
    avatar: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAJQAtQMBIgACEQEDEQH/xAAcAAABBQEBAQAAAAAAAAAAAAADAAIEBQYBBwj/xABBEAABAwIDBQMICQMCBwAAAAABAAIDBBEFEiEGMUFRYRMicTJCcoGhscHRBxQVQ1JigpGSFiMz4fFERVNUY4PC/8QAGgEAAwEBAQEAAAAAAAAAAAAAAAECAwQGBf/EACQRAAICAQQCAgMBAAAAAAAAAAABAhEDBCExURRBEhMyYXEi/9oADAMBAAIRAxEAPwC7ZJcaogAdwuVXMlUqOYjivTnnkCqayCHEqbD3h/a1LXOjIGndFzdHkgCz+ITOdtthNhfLBIT0BDtfYtJ2gO8KIyuzaSSSIvYngU0wkKYMq6Q1URRByEJpaprmA7kJ0R4IsZEy6ruqI5hB3JljySAalddOiaUAdK4lwTdeFkgEQuWS1Xd2pQAsqaWIf1umzOaJ47tNj3xoV0VdOfvWnwN0Wh0zjmIThZENTC4AscXA8Q0/JCdO3/pyn9Cl0FMadFxMNQXC7aeW36fmhuml4Q29J/yulY6ZICShiaYuLeyjFgPvD8kkrF8S3aUZrk1rLrnaQNuHSsuOANytbIoqJHZttaY/hoz/APS0jXLJmoj/AKyztDnhtLlNhY39firgYi6xLYg0Xtd7llGSV/02nF7Itc9ks6oXYxYXfUwMPTVRDjUJZZ9XK8/kFvdZN5YoSxyNQZLbzYIT6uFg70rB+oLKOxmnDAOykebaucfmov8AUMUbGhrYm2AHeeAoeogvZawSfo2X2jTnyS51+TSfgg/X43C7IpCPUFiJNqA1oa2eAW00Bcoz9qg3utqXkcmxf6LN6qHZa00jduq3uJDYW3HOT5BAfUVGcD+00EG+hPxWCftPe9nVTr77ED4oLtoC77qV3pPWb1cS1pZHoElU9rHE1LQQNAGj43TZa2nZ/krm6f8AksvOXYw8uzCnbfq5DkxepcLdnGB+6jzEUtL+z0L6/Q5nZ6ovAOnecUM4lhgNyzP1Md/evP3YrWcHRtHRqCcSrD9/bqGhJ6wpaVG0wfE6elZVZ2OPaTueMoG4qacfht3YJLeIWCqp52NiyTObdlzY71GNTUO0dUyfyUPVSXBfjxe7PQBj5YxrG04NgB5fTwQ37Qy8IIx1LrrAdpJxlfb0im3J3vP7pPVTYLTQN19v1DWhuSCw4m/zQX4/VfihH6VirA+d7U2zeYUPUzK8eBsDjc2YuM8QJ6BJY6zUkvIn2V9ETf1W0tOCM7s1uEkm/wBShP2tDSTDkbfTuxkrHwRy1MmSmhkld+FjC4+xW1NsttBVAGHCKu3N0eT32TeoyS4JWCCJc+MSukOINMhe7uizsp5fBQpcbqXnyGX33e4uKsqfZbFqyQ4SyJkdZCM8jZH2DR4jxCbi2yNXs9BHJiZp5DPmDBG4m1rXvcDmiX2PcaUEVDsTqjulaPBqE+sqH+VUvPrt7lqdjdjKbaH6waipmh7INIEdrG9+fgtbH9F+Dt8uSpl8ZLe5EcOWW43kjE8jc4OPfc5x6lcOW17aL2aP6O8CjOtC6T053n4qWzZHBaexbg9JpxLM3vWi0k3y0Q9RHo8OzM0sAiNbI4XbG4+DSV7vHhdFD/ioqdnoxAIv1djR3Y2N8GhWtE/bIeq/R4RHS1b/ACaWY+ERKM3CcUfqzD6s/wDod8l7gY3DchPZIOZVrRLsl6p9HjTcAxt40w2qt1bb3ojdl8cf/wAvePSe0fFeuOa/iChuaeXsT8KC5bJ8uXR5DX4DiWHxtfVsjjzmzW9oCT6glSYdCWEzAvJWz2zZndRtI07x9yzZblaQdFzZMUYSpHRDI5xTGM2arsWaJKLsuzj7h7R9tU8bC4vbfTfzPyWr2OcG4dNa3+Y6eoK+7TnouiOmxyVs556icXSPOBsLinnS0zfWfknjYLELa1VKP3XofaDkEi4cgr8TER5WQ88dsJXD/iqf1App2IrRvq6f+JXobi0hBcWW3JeJi6DychgP6Jq/+8g/iVxbpzhdcR4uLofk5Ozb4Ti+H10d8LqaWZg3tie0FviOB9SsQ9p8qMnwIK+b8JxSSmqGyQyuhmbuLeK3+FbZucGR1zzE86dqPIJ68vcoxzjI3mpQ4NBgPZSfSJjpeC1oiAHTyVA+mGOIQ4WIn3zdrp/BQMAr3DarFKgP8sb/AFhC+kKrdWNogX5gwSe0t+SJR/xdgsiv40XH0SUbpoKwssLMjHvW6lw+Zg0ZcdAsJ9F+Ivw2nqsrGPD8nleBXoUW0rfvKZg8HKFLNFf5Vo1rC9nyVrmyRmxbbxC5mJ0cp82LUFRU07ZoS27nG4IPmlSW/Ycne+skN5AFV5LX5RZMtPF/jIphFE++Z5HgEx1NGN0jv2VxUU+FOZmp6gg24myrcQhZEy9O7P3mC5I4uAVwzqXZMtPJRvYhvhcNxugTHsI3SSHuMBJPIBWHYykAho/cKk2wkdT7OVz9WkR2/cgfFavKkjH6n7Kah2rbilXJTYVhtZWyRgucIW3Nr2v4KU7Fq5htNs5jTRzFFI73NWP+i/GabA8dklqQ8vqYeyjDS0DMXjeXEADqvaIZsZroBLSUFC1tyAZqw30NtzGke1c6zyrkJ41GVJHlO0U7sQMMgoMRp2xB2YzUMg5dOizbJ45XZaGelmfa5zkg26Aheo7S1m0TaPGYnzYdEykonTSBjHPzNLXGwJI105LyOjwMGKNxrWh4F7RjySCeOnP2rHLK2dGnuv4SPtOvif3XtaAdQDY8tysaHah5e1sln6634IrDXvkN2UtQ2QgkPOQEZ3yHoNXkeAAVTLLS1tJCzs209ZTtDBOD3ZQNBn5Hqo3hvFm/57Sib6gqKesjzQuu7i3iEd4a1eeYXiFRTVBDXEOZvyuGvgtvQYjHWxgSANltewO9deHUKW0uThz6Zw3jwGcRbRBe4I7429VHfGBxXTZyAHHXeknOYLpIso8oDW+c31hSoqqRkeXOAPzC6ihxsRfQrh1G5fEUqPrF1BidTh0bZKSXs3P0Nmggj1ooxOor4i6peHlpsNLWVXWa00XiPclQvIY9oPFa/JqVWZ/FVZoaTHarCGt+rCNwkGokBO5WcH0gVTbdtRwu9F5HvWSrHX7IGx7vBKOlc9md5EcZ85+gT+3InUWJwi+TfU+3tLJNE6oppYsmbNls7eFZ0W19HJIcrZTHa+YxnRYGgw6N+V4BDB57+PgPmrqGKKOMtjIa0NJI5rohKb/IzcEuDT1e19BGHiV72ktcGtEZuSodVt3hz2BscE7iJGkmwGgcD8Fn2VUUcop6todG7/G52tuiZUYTRSEmF3ZnknKUnwJJLZmjP0h0ouG0ctvSCrcd2yjxXC6iiZTPYZm2Di7dqD8FmqnC547ljmvHQqC9kkfltLbLCU5o0STAUkQjlvUZi3kwj4rU0u0VHRUTqanpJCDvzhpzeOu5Zm6aXLOOVxWxUoqTtl3X1eGVVHUiKmqGSOgIhbYFrXktJ49Dr1VDTVctGzs3sNhz4af7qxw9xdTyAGxLvgg1NLLIC7tmk9QnK5bmkGkSaTFnSSgh37FTp6OHERnhf2NRvNvJeevzWasYJcpaL9FPpKx7CLX8VF9mhZUuGTtkzVLAHjgNx9atIw+myyMkbGWnNmeO6PHoo1FWF7LP3I817OF7giy0hS3RnO5bMknFJHi4xXD7eA+aAMQqJHOH2rQaHTujXrvWCmj7OV8ZHkuITT14K3qX0YeOuzfGpqzuxKiP6R80lgS480keS+h/Qux1l1Ejie8jSw6qfBhwtnk3DiSuZQbNW6ATsdJCwMbcjUrsGHufZ735G89ylF8MNuzGY8zqnwxTVXlaMHBbfBNk2cYI2Pyxs7aUbnu1A9SnwUwztfUnPJwHAJ8EMcItG2x5qQ0Aa7ytoxJbCttawsPBEaQGP11IQm3sngf2xY79VoSRqiFs8LmEC43HkhUNTuhqLhw0DifYVLaQ2QlQcQhLXdo0cNbKJbbofOxZFmXiShyQsk8oFAw+tDssM56NfzU9zLcfYjknhlTPhcbySzRVtRhkjLlpPrC01uq5qpcIspSM3RMdDEWyb817jVHlkjZGSXBW8tNFKbuj15jRQ5sNa43sH8gTYpKNcBZQ1Eb3VTHtBIACkFjY3aceCm1FE0MIHaR+Oo9ijMp3xtyyFrgNzgVjkjTs1hL0SKWTiDY8lYxVF22Kz73OidodOalU1SSQHFJMshYzFkr3OYCWyDMPHioBbx0VzitO+SAStOsZv6lSm43nVSxHTkJ0vbqkuePsSUgXZlhhFowHH8RQDJLUOtqPFchgL3AbzyVpTU7YtSPErpSbMmwNLRDQv/ZThZrQ0aLhNzpoE4EclqlXBI5ie219UPMB5qI234VSAJoNxTtbabrIV2k2T3Oba1roAG/eCV0gWtfd7k17hwb7VxjhcA8UAV1SwRTHKf7Z1AVhh9be0U5NvNdf2FMniDo3s84at8VW3s4tdvG8LJ7MbVo0xamuFlXYdXaiGY9GO+BVjICPNWl2ZU0DceSZmK6+40smHNfcEjQfqgS0scmpbY/lRe/wDUsx5NHrRt7BbGcqoHslMUg1GrT+Ic0FhyOHRXuJRGalc5xa3J3gVnnvDR3iuaapm0XaLiKsY6nLJdxBCzDiGSuDTmaDp4J09Q9+gPd49VHWTZRObI212MuPSSURryNySdkmthY1gG5PLuSHdJq7DAM0p10MGyddMB41RAUJpTrpoY+/eBXSdSmgrjimB0pjnW1Av4JXXLqQQ9xzMDrEFQayMk9tc/mAF7KW3cui2bKRvCUlY7KsOFrA3KtsNxG5bBUuvwa8+4qrqITTyW8x2rUzeFCbQNWaaRoaEAmx3KHh1eO7DUnS9muJ9isZGjeBody05I4B3Vbi2KMocjRH2j3a2vawVgQqLaaEmKKoZvYcrugO5TNtLYuO7INdjclXSugMQYHEXIffQcFWSSuee8bpq4uNyb5N6oSSSSQHQbcF1cSQBq2p4QwU4FdxzD7roTbpwKACXSuhkrmYoGHBXCUMOsAu3TsB11y9ym3XL6pWA9rrpx5hCBTgUwCSsFRCW316cFUnuEtdcFpsbqyY7K433HgoddGXt7aJpBGj/Dms2NAjuVhh9fqIZjpazXHh0VW29rn1pFCdDaNM5AnijmjdHI0Oa4WIKr8Ord0EzvRefcrKx3W8OqrlE8GPxTDn0MgIOeJ3ku4+BUBbPEaX65SviJs7e0jgVjXgtcQRYg2IXLkj8WbRdo4kkkoKEkkkgDUBPCSS7jlOjUog3JJIH7G7yupJJAJ3mj8y7wSSTGJcKSSQHLrrSbpJIQCcdCUWDyLHde1kkkmBWSANfIB5psEMbr9UklBRywcdVb4ZM+SCz3XyuABSSRHkUiS9ZLG42sxB+UWzAOPiV1JGbgrHyV6SSS5TUSSSSAP/2Q==",
    address: "123 Main St, Anytown, USA",
    city: "Anytown",
    state: "CA",
    zip: "12345",
    time: "12:00 PM",
  };

  const conversations = [
    { ...profile, name: "John Doe", time: "12:00 PM" },
    { ...profile, name: "Alexa Marsh", time: "11:42 AM" },
    { ...profile, name: "Ken Adams", time: "Yesterday" },
    { ...profile, name: "Sofia Lee", time: "Mon" },
  ];

  const messages = [
    {
      id: 1,
      text: "Hey! Are we still on for the meeting?",
      time: "11:31 AM",
      isSent: false,
    },
    {
      id: 2,
      text: "Yes, in 20 mins. I am wrapping up the UI.",
      time: "11:34 AM",
      isSent: true,
    },
    {
      id: 3,
      text: "Great. Can you also share the latest screen?",
      time: "11:35 AM",
      isSent: false,
    },
    {
      id: 4,
      text: "Sure, I will send it right after this message.",
      time: "11:36 AM",
      isSent: true,
    },
    { id: 5, text: "Perfect, thanks!", time: "11:37 AM", isSent: false },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.rootMessages}>
        <div className={styles.rootMessagesHeader}>
          <h2>Messages</h2>
          <button type="button">New Chat</button>
        </div>

        <div className={styles.rootMessagesList}>
          {conversations.map((item) => (
            <RecivedProfile key={`${item.name}-${item.time}`} profile={item} />
          ))}
        </div>
      </div>

      <div className={styles.rootChatbox}>
        <div className={styles.rootHeader}>
          <div className={styles.rootHeaderProfile}>
            <div className={styles.rootHeaderProfileDot} />
            <div>
              <h1>{profile.name}</h1>
              <p>Online now</p>
            </div>
          </div>
          <div className={styles.rootHeaderActions}>
            <button type="button" aria-label="Voice Call">
              Call
            </button>
            <button type="button" aria-label="Video Call">
              Video
            </button>
            <button type="button" aria-label="Open More Options">
              More
            </button>
          </div>
        </div>

        <div className={styles.rootContent}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.isSent ? styles.rootContentSent : styles.rootContentReceived
              }
            >
              <p>{message.text}</p>
              <span>{message.time}</span>
            </div>
          ))}
        </div>

        <div className={styles.rootFooter}>
          <button type="button" aria-label="Attach File">
            +
          </button>
          <input type="text" placeholder="Type a message..." />
          <button type="button" aria-label="Send Message">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbox;
