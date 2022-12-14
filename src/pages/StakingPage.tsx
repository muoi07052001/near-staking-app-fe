import React, {useEffect, useState} from 'react';
import {Radio, InputNumber, Tabs, notification} from "antd";
import {
    wallet,
    parseTokenAmount,
    parseTokenWithDecimals,
    formatNumber, login,
} from "~utils/near";
import ftContract from "~utils/ft-contract";
import {getTokenMetadata} from "~utils/token";
import {harvest, stakeToken, stakingContract, unstake, withdraw} from "~utils/staking-contract";
import moment from "moment";
import {MyButton, MaxButton} from "~components/button";
import {IntervalSpinner} from "~components/spiner/IntervalSpinner";
import {CreditCardOutlined} from "@ant-design/icons";

const { TabPane } = Tabs;


function StakingPage() {
    const [balance, setBalance] = useState(0);
    const [tabValue, setTabValue] = useState("stake");
    const [stakeValue, setStakeValue] = useState(0);
    const [unstakeValue, setUnstakeValue] = useState(0);
    const [stakingAccount, setStakingAccount] = useState({
        accountId: "",
        canWithdraw: true,
        reward: 0,
        stakeBalance: 0,
        startUnstakeTimestamp: 0,
        unstakeBalance: 0,
    });

    const [stakeLoading, setStakeLoading] = useState(false);
    const [unstakeLoading, setUnstakeLoading] = useState(false);
    const [claimLoading, setClaimLoading] = useState(false);
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [poolInfo, setPoolInfo] = useState({
        totalStakeBalance: 0,
        totalReward: 0,
        totalStaker: 0,
        isPaused: Boolean
    })

    const options = [
        { label: 'Stake', value: 'stake' },
        { label: 'Unstake', value: 'unstake' }
    ];

    const getBalance = async () => {
        let balance = "0";
        if (wallet.isSignedIn()) {
            //@ts-ignore
            balance = await ftContract.ft_balance_of({account_id: wallet.getAccountId()});
        }

        setBalance(parseTokenWithDecimals(parseInt(balance), 24))
    }

    const getPoolInfo = async () => {
        //@ts-ignore
        let poolInfo: any = await stakingContract.get_pool_info();
        setPoolInfo({
            totalStakeBalance: parseInt(poolInfo.total_stake_balance),
            totalReward: parseInt(poolInfo.total_reward),
            totalStaker: parseInt(poolInfo.total_stakers),
            isPaused: poolInfo.is_paused
        })
    }

    const getStakingAccountInfo = async () => {
        if (wallet.isSignedIn()) {
            //@ts-ignore
            let rawData = await stakingContract.get_account_info({account_id: wallet.getAccountId()});

            let data = {
                accountId: wallet.getAccountId(),
                canWithdraw: rawData.can_withdraw,
                stakeBalance: parseInt(rawData.stake_balance),
                unstakeBalance: parseInt(rawData.unstake_balance),
                reward: parseInt(rawData.reward),
                startUnstakeTimestamp: parseInt(rawData.start_unstake_timestamp)
            };
            setStakingAccount(data);
        }
    }

    const refreshData = () => {
        Promise.all([
            getBalance(),
            getStakingAccountInfo(),
            getPoolInfo()
        ]).catch(e => {

        })
    }

    const handleStakeToken = async () => {
        if (!wallet.isSignedIn()) await login();
        if (!stakeValue || stakeValue <= 0 || stakeValue > balance) return;
        setStakeLoading(true);
        try {
            await stakeToken(parseTokenAmount(stakeValue, getTokenMetadata("VBIC").decimals).toLocaleString())
        } catch (e) {
            console.log("Error", e);
        } finally {
            setStakeLoading(false);
        }
    }

    const handleUnstakeToken = async () => {
        if (!wallet.isSignedIn()) await login();
      if (!unstakeValue || unstakeValue <= 0 || unstakeValue > parseTokenWithDecimals(stakingAccount.stakeBalance, getTokenMetadata("VBIC").decimals)) return;
      setUnstakeLoading(true);
      try {
          await unstake(parseTokenAmount(unstakeValue, getTokenMetadata("VBIC").decimals).toLocaleString())
      } catch (e) {
          console.log("Error", e);
      } finally {
          setUnstakeLoading(false);
      }
    }

    const handleClaimReward = async () => {
        if (!wallet.isSignedIn()) await login();
        if (parseTokenWithDecimals(stakingAccount.reward, getTokenMetadata("VBIC").decimals) < 1) return;
        setClaimLoading(true);
        try {
            await harvest();
        } catch (e) {
            console.log("Error", e);
        } finally {
            setClaimLoading(false);
        }
    }

    const handleWithdraw = async () => {
        if (!wallet.isSignedIn()) await login();
        if (!stakingAccount.canWithdraw || stakingAccount.unstakeBalance == 0) return;
        setWithdrawLoading(true);
        try {
            await withdraw();
        } catch (e) {
            console.log("Error", e);
        } finally {
            setWithdrawLoading(false);
        }
    }

    useEffect( () => {
        refreshData();
    }, [wallet.getAccountId(), wallet.isSignedIn()])

    return (
        <div className="staking w-full">
            <section className="w-full md:w-560px lg:w-560px xl:w-560px m-auto relative xs:px-2">
                <div className="flex flex-row justify-between items-center">
                    <h1 className={"text-white text-3xl"}>
                        Staking
                    </h1>
                    <IntervalSpinner onProgressSuccess={refreshData} />
                </div>
                <div className={"flex flex-col mt-5 justify-between"}>
                    <div className={"flex flex-row justify-between mb-2 bg-cardBg rounded-2xl p-5 w-full"}>
                        <p className={"text-base text-primaryText"}>Staking APR</p>
                        <p className={"text-2xl text-white"}>18%</p>
                    </div>
                    <div className={"flex flex-col justify-between mb-2 bg-cardBg rounded-2xl p-5 w-full"}>
                        <p className={"text-base text-primary mb-4"}>{ wallet.getAccountId() }</p>
                        <div className="flex flex-row justify-between">
                            <span className="text-sm text-primaryText">Total staked</span>
                            <span className="text-sm text-white font-bold">{formatNumber(parseTokenWithDecimals(stakingAccount.stakeBalance, getTokenMetadata("VBIC").decimals))} VBIC</span>
                        </div>
                        <div className="flex flex-row justify-between mb-3">
                            <span className="text-sm text-primaryText">Pending Reward</span>
                            <span className="text-sm text-white font-bold">{formatNumber(parseTokenWithDecimals(stakingAccount.reward, getTokenMetadata("VBIC").decimals))} VBIC</span>
                        </div>
                        <p className="text-xs text-primaryText mb-1"><span>You can claim reward when reward balance greater than 1 VBIC</span></p>
                        <MyButton onClick={handleClaimReward} loading={claimLoading} disable={parseTokenWithDecimals(stakingAccount.reward, getTokenMetadata("VBIC").decimals) < 1} text="Claim Reward"/>
                    </div>
                    <div className={"bg-cardBg rounded-2xl p-5 mb-2"}>
                        <div className={"bg-black bg-opacity-20 rounded-xl p-1"}>
                            <Radio.Group
                              className={"radio-stake"}
                              options={options}
                              onChange={(e) => { setTabValue(e.target.value) }}
                              value={tabValue}
                              optionType="button"
                            />
                        </div>

                        <Tabs activeKey={tabValue} className="staking-tabs">
                            <TabPane key="stake">
                                <div className={"input-form mt-5"}>
                                    <p className="flex flex-row items-center text-primaryText mb-2">
                                        <CreditCardOutlined />
                                        <span className="text-primaryText mr-2 ml-1">Balance:</span>
                                        {formatNumber(balance)}
                                        <img className="mr-1 ml-2" style={{width: 15, height: 15}} src={getTokenMetadata("VBIC").icon} alt=""/><span className="text-primary">VBIC</span>
                                    </p>
                                    <InputNumber min={0} className={"staking-input font-bold mb-4 rounded"} addonAfter={<MaxButton onClick={() => setStakeValue(balance)} />} value={stakeValue} onChange={(value) => setStakeValue(value)} defaultValue={0} />

                                    <p className="text-xs text-primaryText mb-1"><span>Unstaked tokens will be made available pending a release period of ~12hrs (1 epochs).</span></p>
                                    <MyButton onClick={handleStakeToken} loading={stakeLoading} disable={
                                      !stakeValue || stakeValue <= 0 || stakeValue > balance
                                    } text="Stake"/>
                                </div>
                            </TabPane>
                            <TabPane key="unstake">
                                <div className={"input-form mt-5"}>
                                    <p className="flex flex-row items-center text-primaryText mb-2">
                                        <CreditCardOutlined />
                                        <span className="text-primaryText mr-2 ml-1">Staked balance:</span>
                                        {formatNumber(parseTokenWithDecimals(stakingAccount.stakeBalance, getTokenMetadata("VBIC").decimals))}
                                        <img className="mr-1 ml-2" style={{width: 15, height: 15}} src={getTokenMetadata("VBIC").icon} alt=""/><span className="text-primary">VBIC</span>
                                    </p>
                                    <InputNumber min={0} className={"staking-input font-bold mb-4 rounded"} addonAfter={<MaxButton onClick={() => setUnstakeValue(parseTokenWithDecimals(stakingAccount.stakeBalance, getTokenMetadata("VBIC").decimals))} />} value={unstakeValue} onChange={(value) => setUnstakeValue(value)} defaultValue={0} />

                                    <p className="text-xs text-primaryText mb-1">Unstaked tokens will be made available pending a release period of ~12hrs (1 epochs).</p>
                                    <MyButton onClick={handleUnstakeToken} loading={unstakeLoading} disable={
                                      !unstakeValue || unstakeValue <= 0 || unstakeValue > parseTokenWithDecimals(stakingAccount.stakeBalance, getTokenMetadata("VBIC").decimals)
                                    } text="Unstake"/>
                                </div>
                            </TabPane>
                        </Tabs>
                    </div>

                    {
                        stakingAccount.unstakeBalance > 0 &&
                        <div className={"flex flex-col justify-between bg-cardBg rounded-2xl p-5 w-full"}>
                            <p className={"text-base text-primaryText mb-4"}>Withdraw</p>
                            <div className="flex flex-row justify-between mb-0.5">
                                <span className="text-sm text-primaryText">Unstaked</span>
                                <span className="text-sm text-white font-bold">{formatNumber(parseTokenWithDecimals(stakingAccount.unstakeBalance, getTokenMetadata("VBIC").decimals))} VBIC</span>
                            </div>
                            <div className="flex flex-row justify-between mb-0.5">
                                <span className="text-sm text-primaryText">Unstaked at</span>
                                <span className="text-sm text-white font-bold">{moment(Math.floor(stakingAccount.startUnstakeTimestamp / 1000000)).format("YYYY-MM-DD HH:mm")}</span>
                            </div>
                            <div className="flex flex-row justify-between mb-3">
                                <span className="text-sm text-primaryText">Release date (expected)</span>
                                <span className="text-sm text-white font-bold">{moment(Math.floor(stakingAccount.startUnstakeTimestamp / 1000000)).add(43200, "s").format("YYYY-MM-DD HH:mm")}</span>
                            </div>
                            <p className="text-xs text-primaryText mb-1">
                                { stakingAccount.canWithdraw ? "You can withdraw unstaked token now." :
                                  `You can withdraw unstaked token at ${moment(Math.floor(stakingAccount.startUnstakeTimestamp / 1000000)).add(43200, "s").format("YYYY-MM-DD HH:mm")}. Please wait more time!` }
                            </p>
                            <MyButton onClick={handleWithdraw} loading={withdrawLoading} disable={!stakingAccount.canWithdraw || stakingAccount.unstakeBalance == 0} text="Withdraw"/>
                        </div>
                    }
                    <div className="w-full grid mt-3 grid-cols-2 lg:grid-rows-2 gap-2">
                        <div
                          className="lg:h-16 xs:h-20 md:h-20 rounded-lg bg-darkGradientBg shadow-dark p-2.5 hover:bg-darkGradientHoverBg">
                            <div className="text-primaryText text-xs mb-1 xs:h-8 md:h-8 lg:text-center">
                                Staking Pool Status
                            </div>
                            <div className="lg:flex lg:justify-center lg:items-center">
                                <label className="text-base font-medium text-xREFColor">{poolInfo.isPaused ? "Paused": "Active"}</label>
                            </div>
                        </div>
                        <div
                          className="lg:h-16 xs:h-20 md:h-20 rounded-lg bg-darkGradientBg shadow-dark p-2.5 hover:bg-darkGradientHoverBg">
                            <div className="text-primaryText text-xs mb-1 xs:h-8 md:h-8 lg:text-center">
                                Number of Unique Stakers
                            </div>
                            <div className="lg:flex lg:justify-center lg:items-center">
                                <label className="text-base font-medium text-xREFColor">{formatNumber(poolInfo.totalStaker)}</label>
                                <label className="text-xs ml-1.5 text-primaryText">Accounts</label>
                            </div>
                        </div>
                        <div
                          className="lg:h-16 xs:h-20 md:h-20 rounded-lg bg-darkGradientBg shadow-dark p-2.5 hover:bg-darkGradientHoverBg">
                            <div className="text-primaryText text-xs mb-1 xs:h-8 md:h-8 lg:text-center">
                                Total VBIC Staked
                            </div>
                            <div className="lg:flex lg:justify-center lg:items-center">
                                <label className="text-base font-medium text-xREFColor">{formatNumber(parseTokenWithDecimals(poolInfo.totalStakeBalance, getTokenMetadata("VBIC").decimals))}</label>
                                <label className="text-xs ml-1.5 text-primaryText">VBIC</label>
                            </div>
                        </div>
                        <div
                          className="lg:h-16 xs:h-20 md:h-20 rounded-lg bg-darkGradientBg shadow-dark p-2.5 hover:bg-darkGradientHoverBg">
                            <div className="text-primaryText text-xs mb-1 xs:h-8 md:h-8 lg:text-center">
                                Total Reward Earned
                            </div>
                            <div className="lg:flex lg:justify-center lg:items-center">
                                <label className="text-base font-medium text-xREFColor">{formatNumber(parseTokenWithDecimals(poolInfo.totalReward, getTokenMetadata("VBIC").decimals))}</label>
                                <label className="text-xs ml-1.5 text-primaryText">VBIC</label>
                            </div>
                        </div>
                    </div>
                </div>
          </section>
        </div>
      );
}

export default StakingPage;
