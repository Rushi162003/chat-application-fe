import Image from "next/image";
import styles from "./RecivedProfile.module.scss";


const RecivedProfile = ({ profile }: { profile: { name: string, email: string, phone: string, address: string, city: string, state: string, zip: string, avatar: string, time: string } }) => {
    return (
        <div className={styles.root}>
            <div className={styles.rootImageContainer}>
                <Image className={styles.rootImageContainerImg} src={profile.avatar} alt={profile.name} width={100} height={100} />
            </div>
            <div className={styles.rootInfo}>
                <div className={styles.rootInfoHeader}>
                    <span className={styles.rootInfoHeaderName}>{profile.name}</span>
                    <span className={styles.rootInfoHeaderTime}>{profile.time}</span>
                </div>
                <span className={styles.rootInfoMessage}>{profile.email}</span>
            </div>
        </div>
    );
};

export default RecivedProfile;